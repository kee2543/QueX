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

// Protected routes (require JWT)
router.get('/me', auth, authController.getProfile);
router.patch('/me', [
  auth,
  body('name').optional().notEmpty().trim().escape(),
  validate
], authController.updateProfile);

module.exports = router;
