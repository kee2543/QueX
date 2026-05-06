const authService = require('../services/auth.service');

const authController = {
  /**
   * POST /api/auth/register
   * Register a new user (ORG or USER)
   */
  async register(req, res) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({
          error: 'All fields are required: name, email, password, role.',
        });
      }

      const result = await authService.register({ name, email, password, role });
      res.status(201).json(result);
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'Internal server error.';
      res.status(status).json({ error: message });
    }
  },

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required.',
        });
      }

      const result = await authService.login({ email, password });
      res.json(result);
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'Internal server error.';
      res.status(status).json({ error: message });
    }
  },

  /**
   * POST /api/auth/otp/send
   * Send a 6-digit OTP to the given email address
   */
  async sendOtp(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      const result = await authService.sendOtp({ email });
      res.json(result);
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'Internal server error.';
      res.status(status).json({ error: message });
    }
  },

  /**
   * POST /api/auth/otp/verify
   * Verify a 6-digit OTP and return JWT
   */
  async verifyOtp(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: 'Email and verification code are required.' });
      }

      const result = await authService.verifyOtp({ email, code });
      res.json(result);
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'Internal server error.';
      res.status(status).json({ error: message });
    }
  },

  /**
   * POST /api/auth/google
   * Authenticate with a Google ID token
   */
  async googleOAuth(req, res) {
    try {
      const { idToken, role } = req.body;

      if (!idToken) {
        return res.status(400).json({ error: 'Google ID token is required.' });
      }

      const result = await authService.googleOAuth({ idToken, role });
      res.json(result);
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'Internal server error.';
      res.status(status).json({ error: message });
    }
  },

  /**
   * GET /api/auth/me
   * Get current user's profile
   */
  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.user.accountId, req.user.profileId, req.user.role);
      res.json(user);
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'Internal server error.';
      res.status(status).json({ error: message });
    }
  },

  /**
   * PATCH /api/auth/me
   * Update current user's profile (name, password)
   */
  async updateProfile(req, res) {
    try {
      const { name, password } = req.body;
      const user = await authService.updateProfile(req.user.accountId, req.user.profileId, req.user.role, { name, password });
      res.json(user);
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'Internal server error.';
      res.status(status).json({ error: message });
    }
  },
};

module.exports = authController;
