const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const accountRepository = require('../repositories/account.repository');
const userRepository = require('../repositories/user.repository');
const orgRepository = require('../repositories/org.repository');

const SALT_ROUNDS = 10;

const authService = {
  async register({ name, email, password, role }) {
    if (!['ORG', 'USER'].includes(role)) {
      throw { status: 400, message: 'Role must be either ORG or USER.' };
    }

    const existing = await accountRepository.findByEmail(email);
    if (existing) {
      throw { status: 409, message: 'An account with this email already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const account = await accountRepository.create({
      email,
      password: hashedPassword,
      role,
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
    const account = await accountRepository.findByEmail(email);
    if (!account) {
      throw { status: 401, message: 'Invalid email or password.' };
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

  generateToken(account, profileId) {
    return jwt.sign(
      { accountId: account.id, profileId, email: account.email, role: account.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  },
};

module.exports = authService;
