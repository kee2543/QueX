const { validationResult } = require('express-validator');

/**
 * Middleware to check for validation errors and return 400 if they exist.
 * This ensures that only valid data reaches the services.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed.',
      details: errors.array().map(err => ({ field: err.path, message: err.msg })) 
    });
  }
  next();
};

module.exports = validate;
