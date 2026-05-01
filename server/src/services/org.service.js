const orgRepository = require('../repositories/org.repository');

const orgService = {
  async createOrganization(accountId, { name, description }) {
    const existing = await orgRepository.findByAccountId(accountId);
    if (existing) {
      throw { status: 409, message: 'You already have an organization.' };
    }
    return orgRepository.create(accountId, { name, description });
  },

  async getOwnOrganization(accountId) {
    const org = await orgRepository.findByAccountId(accountId);
    if (!org) {
      throw { status: 404, message: 'You have not created an organization yet.' };
    }
    return org;
  },

  async updateOrganization(accountId, { name, description }) {
    const org = await orgRepository.findByAccountId(accountId);
    if (!org) {
      throw { status: 404, message: 'You have not created an organization yet.' };
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      throw { status: 400, message: 'No fields to update.' };
    }

    return orgRepository.update(org.id, updateData);
  },
};

module.exports = orgService;
