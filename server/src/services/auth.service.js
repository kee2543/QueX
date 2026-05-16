const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const accountRepository = require('../repositories/account.repository');
const userRepository = require('../repositories/user.repository');
const orgRepository = require('../repositories/org.repository');
const otpRepository = require('../repositories/otp.repository');
const emailService = require('./email.service');

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authService = {
  async register({ name, email, password, role }) {
    if (!['ORG', 'USER'].includes(role)) {
      throw { status: 400, message: 'Role must be either ORG or USER.' };
    }

    const sanitizedEmail = email.trim().toLowerCase();

    const existing = await accountRepository.findByEmail(sanitizedEmail);
    if (existing) {
      throw { status: 409, message: 'An account with this email already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const account = await accountRepository.create({
      email: sanitizedEmail,
      password: hashedPassword,
      role,
      authProvider: 'LOCAL',
    });

    let profileId;
    if (role === 'USER') {
      const user = await userRepository.create(account.id, { name });
      profileId = user.id;
    } else {
      const org = await orgRepository.create(account.id, { name, description: '' });
      profileId = org.id;
    }

    const token = this.generateToken(account, profileId);

    return { user: { id: profileId, accountId: account.id, name, email, role }, token };
  },

  async login({ email, password }) {
    const sanitizedEmail = email.trim().toLowerCase();
    const account = await accountRepository.findByEmail(sanitizedEmail);
    if (!account) {
      throw { status: 401, message: 'Invalid email or password.' };
    }

    if (!account.password) {
      throw {
        status: 400,
        message: `This account uses ${account.authProvider} sign-in. Please use that method instead.`,
      };
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      throw { status: 401, message: 'Invalid email or password.' };
    }

    let profile;
    let profileId;
    let name;

    if (account.role === 'USER') {
      profile = await userRepository.findByAccountId(account.id);
      profileId = profile.id;
      name = profile.name;
    } else {
      profile = await orgRepository.findByAccountId(account.id);
      profileId = profile.id;
      name = profile.name;
    }

    const token = this.generateToken(account, profileId);

    return { user: { id: profileId, accountId: account.id, name, email, role: account.role }, token };
  },

  // ─── OTP Flow ──────────────────────────────────────────────

  /**
   * Send a 6-digit OTP to the given email address.
   * Creates an account (role: USER, provider: OTP) if one doesn't exist.
   */
  async sendOtp({ email }) {
    const sanitizedEmail = email.trim().toLowerCase();
    // Find or create an account for this email
    let account = await accountRepository.findByEmail(sanitizedEmail);

    if (!account) {
      // Create a new account without a password for OTP-only users
      account = await accountRepository.create({
        email: sanitizedEmail,
        password: null,
        role: 'USER',
        authProvider: 'OTP',
      });

      // Create a user profile with the email prefix as a default name
      const defaultName = sanitizedEmail.split('@')[0];
      await userRepository.create(account.id, { name: defaultName });
    }

    // Invalidate any existing unused OTPs for this account
    await otpRepository.invalidateAll(account.id);

    // Generate a 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await otpRepository.create(account.id, code, expiresAt);

    // Send the OTP email
    await emailService.sendOtpEmail(sanitizedEmail, code);

    return { message: 'Verification code sent to your email.' };
  },

  /**
   * Verify a 6-digit OTP code and return a JWT.
   */
  async verifyOtp({ email, code }) {
    const sanitizedEmail = email.trim().toLowerCase();
    const account = await accountRepository.findByEmail(sanitizedEmail);
    if (!account) {
      throw { status: 401, message: 'Invalid email or verification code.' };
    }

    const otp = await otpRepository.findLatestValid(account.id);
    if (!otp) {
      throw { status: 401, message: 'No valid verification code found. Please request a new one.' };
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await otpRepository.markUsed(otp.id);
      throw { status: 429, message: 'Too many attempts. Please request a new code.' };
    }

    if (otp.code !== code) {
      await otpRepository.incrementAttempts(otp.id);
      const remaining = OTP_MAX_ATTEMPTS - otp.attempts - 1;
      throw {
        status: 401,
        message: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      };
    }

    // OTP is valid — mark as used
    await otpRepository.markUsed(otp.id);

    // Fetch the user profile
    const { profileId, name } = await this._getProfileInfo(account);

    const token = this.generateToken(account, profileId);

    return {
      user: { id: profileId, accountId: account.id, name, email, role: account.role },
      token,
    };
  },

  // ─── Google OAuth ──────────────────────────────────────────

  /**
   * Authenticate with a Google ID token.
   * Creates a new account + profile if the user doesn't exist.
   */
  async googleOAuth({ idToken, role = 'USER' }) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw { status: 500, message: 'Google OAuth is not configured on this server.' };
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      throw { status: 401, message: 'Invalid Google token.' };
    }

    const { email: googleEmail, name: googleName, email_verified } = payload;
    const sanitizedEmail = googleEmail.trim().toLowerCase();

    if (!email_verified) {
      throw { status: 401, message: 'Google email is not verified.' };
    }

    // Find or create account
    let account = await accountRepository.findByEmail(sanitizedEmail);
    let isNewUser = false;

    if (!account) {
      if (!['ORG', 'USER'].includes(role)) {
        role = 'USER';
      }

      account = await accountRepository.create({
        email: sanitizedEmail,
        password: null,
        role,
        authProvider: 'GOOGLE',
      });
      isNewUser = true;
    }

    // Ensure a profile exists
    let profileId;
    let name;

    if (isNewUser) {
      if (account.role === 'USER') {
        const user = await userRepository.create(account.id, { name: googleName || sanitizedEmail.split('@')[0] });
        profileId = user.id;
        name = user.name;
      } else {
        const org = await orgRepository.create(account.id, { name: googleName || sanitizedEmail.split('@')[0], description: '' });
        profileId = org.id;
        name = org.name;
      }
    } else {
      const info = await this._getProfileInfo(account);
      profileId = info.profileId;
      name = info.name;
    }

    const token = this.generateToken(account, profileId);

    return {
      user: { id: profileId, accountId: account.id, name, email: account.email, role: account.role },
      token,
      isNewUser,
    };
  },

  // ─── Profile ───────────────────────────────────────────────

  async getProfile(accountId, profileId, role) {
    if (role === 'USER') {
      const user = await userRepository.findById(profileId);
      if (!user) throw { status: 404, message: 'User profile not found.' };
      return { id: user.id, accountId, name: user.name, email: user.account.email, role };
    } else {
      const org = await orgRepository.findById(profileId);
      if (!org) throw { status: 404, message: 'Organization profile not found.' };
      return { id: org.id, accountId, name: org.name, email: org.account?.email || '', role };
    }
  },

  async updateProfile(accountId, profileId, role, { name, password }) {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await accountRepository.update(accountId, { password: hashedPassword });
    }

    if (name) {
      if (role === 'USER') {
        await userRepository.update(profileId, { name });
      } else {
        await orgRepository.update(profileId, { name });
      }
    }

    return this.getProfile(accountId, profileId, role);
  },

  // ─── Helpers ───────────────────────────────────────────────

  generateToken(account, profileId) {
    return jwt.sign(
      { accountId: account.id, profileId, email: account.email, role: account.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  },

  /**
   * Get the profile ID and name for a given account.
   */
  async _getProfileInfo(account) {
    let profile, profileId, name;

    if (account.role === 'USER') {
      profile = await userRepository.findByAccountId(account.id);
      if (!profile) throw { status: 404, message: 'User profile not found.' };
      profileId = profile.id;
      name = profile.name;
    } else {
      profile = await orgRepository.findByAccountId(account.id);
      if (!profile) throw { status: 404, message: 'Organization profile not found.' };
      profileId = profile.id;
      name = profile.name;
    }

    return { profileId, name };
  },
};

module.exports = authService;
