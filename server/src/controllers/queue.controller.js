const queueService = require('../services/queue.service');

const queueController = {
  // ─── ORG Endpoints ────────────────────────────────────

  /** POST /api/orgs/me/queues */
  async create(req, res) {
    try {
      const { name, maxCapacity, serviceRate } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Queue name is required.' });
      }
      const queue = await queueService.createQueue(req.user.profileId, { name, maxCapacity, serviceRate });
      res.status(201).json(queue);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /** GET /api/orgs/me/queues */
  async getOwn(req, res) {
    try {
      const queues = await queueService.getOwnQueues(req.user.profileId);
      res.json(queues);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /** GET /api/orgs/me/queues/:queueId */
  async getOneOwn(req, res) {
    try {
      const { queueId } = req.params;
      const queue = await queueService.getOneOwnQueue(req.user.profileId, queueId);
      res.json(queue);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },
  async updateStatus(req, res) {
    try {
      const { queueId } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required (ACTIVE, PAUSED, or CLOSED).' });
      }
      const queue = await queueService.updateQueueStatus(req.user.profileId, queueId, status);
      res.json(queue);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /** POST /api/orgs/me/queues/:queueId/call-next */
  async callNext(req, res) {
    try {
      const { queueId } = req.params;
      const result = await queueService.callNext(req.user.profileId, queueId);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /** DELETE /api/orgs/me/queues/:queueId/entries/:entryId */
  async removeEntry(req, res) {
    try {
      const { queueId, entryId } = req.params;
      const result = await queueService.removeEntry(req.user.profileId, queueId, entryId);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /** DELETE /api/orgs/me/queues/:queueId */
  async delete(req, res) {
    try {
      const { queueId } = req.params;
      const result = await queueService.deleteQueue(req.user.profileId, queueId);
      res.json({ message: 'Queue deleted successfully.', ...result });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  // ─── USER Endpoints ───────────────────────────────────

  /** GET /api/queues */
  async browse(req, res) {
    try {
      const queues = await queueService.browseQueues();
      res.json(queues);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /** GET /api/queues/:id */
  async getDetails(req, res) {
    try {
      const queue = await queueService.getQueueDetails(req.params.id);
      res.json(queue);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },
};

module.exports = queueController;
