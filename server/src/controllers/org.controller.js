const orgService = require('../services/org.service');

const orgController = {
  /**
   * POST /api/orgs — Create organization
   */
  async create(req, res) {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Organization name is required.' });
      }
      const org = await orgService.createOrganization(req.user.accountId, { name, description });
      res.status(201).json(org);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },

  /**
   * PATCH /api/orgs/me — Update own organization
   */
  async update(req, res) {
    try {
      const { name, description } = req.body;
      const org = await orgService.updateOrganization(req.user.accountId, { name, description });
      res.json(org);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
    }
  },
};

module.exports = orgController;
