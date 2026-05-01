const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const orgController = require('../controllers/org.controller');
const queueController = require('../controllers/queue.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const validate = require('../middleware/validate');

// ─── Organization ───────────────────────────────────────
router.post('/', [
  auth,
  roleGuard('ORG'),
  body('name').notEmpty().withMessage('Organization name is required.').trim().escape(),
  body('description').optional().trim().escape(),
  validate
], orgController.create);

router.patch('/me', [
  auth,
  roleGuard('ORG'),
  body('name').optional().notEmpty().trim().escape(),
  body('description').optional().trim().escape(),
  validate
], orgController.update);

// ─── Multiple Queue Management (ORG role) ────────────────
router.post('/me/queues', [
  auth,
  roleGuard('ORG'),
  body('name').notEmpty().withMessage('Queue name is required.').trim().escape(),
  body('maxCapacity').isInt({ min: 1 }).withMessage('Max capacity must be at least 1.'),
  body('serviceRate').isFloat({ min: 0.1 }).withMessage('Service rate must be at least 0.1.'),
  validate
], queueController.create);

router.get('/me/queues', auth, roleGuard('ORG'), queueController.getOwn);

// Individual Queue Actions
router.get('/me/queues/:queueId', [
  auth,
  roleGuard('ORG'),
  param('queueId').isUUID().withMessage('Invalid Queue ID format.'),
  validate
], queueController.getOneOwn);

router.patch('/me/queues/:queueId/status', [
  auth,
  roleGuard('ORG'),
  param('queueId').isUUID().withMessage('Invalid Queue ID format.'),
  body('status').isIn(['ACTIVE', 'PAUSED', 'CLOSED']).withMessage('Invalid status.'),
  validate
], queueController.updateStatus);

router.post('/me/queues/:queueId/call-next', [
  auth,
  roleGuard('ORG'),
  param('queueId').isUUID().withMessage('Invalid Queue ID format.'),
  validate
], queueController.callNext);

router.delete('/me/queues/:queueId/entries/:entryId', [
  auth,
  roleGuard('ORG'),
  param('queueId').isUUID().withMessage('Invalid Queue ID format.'),
  param('entryId').isUUID().withMessage('Invalid Entry ID format.'),
  validate
], queueController.removeEntry);

router.delete('/me/queues/:queueId', [
  auth,
  roleGuard('ORG'),
  param('queueId').isUUID().withMessage('Invalid Queue ID format.'),
  validate
], queueController.delete);

module.exports = router;
