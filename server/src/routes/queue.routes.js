const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queue.controller');
const entryController = require('../controllers/entry.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// ─── Queue Discovery (any authenticated user) ──────────
router.get('/', auth, queueController.browse);
router.get('/:id', auth, queueController.getDetails);

// ─── Queue Actions (USER only) ─────────────────────────
router.get('/me/active', auth, roleGuard('USER'), entryController.getActive);
router.post('/:id/join', auth, roleGuard('USER'), entryController.join);
router.get('/:id/position', auth, roleGuard('USER'), entryController.getPosition);
router.post('/:id/leave', auth, roleGuard('USER'), entryController.leave);
router.patch('/:id/notify', auth, roleGuard('USER'), entryController.updateNotify);

module.exports = router;
