/**
 * Role-Based Access Control Middleware
 * Usage: roleGuard('ORG') or roleGuard('USER') or roleGuard('ORG', 'USER')
 *
 * Must be used AFTER the auth middleware (requires req.user).
 */
const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`
      });
    }

    next();
  };
};

module.exports = roleGuard;
