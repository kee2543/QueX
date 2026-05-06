const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Public routes
router.post('/register', [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  body('name').notEmpty().withMessage('Name is required.').trim().escape(),
  body('role').isIn(['USER', 'ORG']).withMessage('Role must be either USER or ORG.'),
  validate
], authController.register);

router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
  validate
], authController.login);

// OTP routes
router.post('/otp/send', [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  validate
], authController.sendOtp);

router.post('/otp/verify', [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Verification code must be a 6-digit number.'),
  validate
], authController.verifyOtp);

// Google OAuth route
router.post('/google', [
  body('idToken').notEmpty().withMessage('Google ID token is required.'),
  body('role').optional().isIn(['USER', 'ORG']).withMessage('Role must be either USER or ORG.'),
  validate
], authController.googleOAuth);

// Protected routes (require JWT)
router.get('/me', auth, authController.getProfile);
router.patch('/me', [
  auth,
  body('name').optional().notEmpty().trim().escape(),
  validate
], authController.updateProfile);

module.exports = router;
