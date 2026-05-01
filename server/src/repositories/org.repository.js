const prisma = require('../config/db');

const orgRepository = {
  async findByAccountId(accountId) {
    return prisma.organization.findUnique({
      where: { accountId },
      include: { queues: true },
    });
  },

  async findById(id) {
    return prisma.organization.findUnique({
      where: { id },
      include: { queues: true },
    });
  },

  async create(accountId, { name, description }) {
    return prisma.organization.create({
      data: { name, description, accountId },
    });
  },

  async update(id, data) {
    return prisma.organization.update({
      where: { id },
      data,
    });
  },
};

module.exports = orgRepository;
