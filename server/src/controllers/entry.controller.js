const entryService = require('../services/entry.service');

const entryController = {
  /** GET /api/queues/me/active */
  async getActive(req, res) {
    try {
      const entry = await entryService.getActiveEntry(req.user.profileId);
      res.json(entry || null);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /** POST /api/queues/:id/join */
  async join(req, res) {
    try {
      const { notifyAtPosition } = req.body;
      const result = await entryService.joinQueue(req.user.profileId, req.params.id, notifyAtPosition);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /** GET /api/queues/:id/position */
  async getPosition(req, res) {
    try {
      const result = await entryService.getPosition(req.user.profileId, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /** POST /api/queues/:id/leave */
  async leave(req, res) {
    try {
      const result = await entryService.leaveQueue(req.user.profileId, req.params.id);
      res.json({ message: 'You have left the queue.', ...result });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /** PATCH /api/queues/:id/notify */
  async updateNotify(req, res) {
    try {
      const { notifyAtPosition } = req.body;
      if (!notifyAtPosition) {
        return res.status(400).json({ error: 'notifyAtPosition is required.' });
      }
      const result = await entryService.updateNotifyAt(req.user.profileId, req.params.id, notifyAtPosition);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },
};

module.exports = entryController;
