const prisma = require('../config/db');

const userRepository = {
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        account: {
          select: { email: true, role: true }
        }
      }
    });
  },

  async findByAccountId(accountId) {
    return prisma.user.findUnique({
      where: { accountId },
      include: {
        account: {
          select: { email: true, role: true }
        }
      }
    });
  },

  async create(accountId, { name }) {
    return prisma.user.create({
      data: { name, accountId },
    });
  },

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
    });
  },
};

module.exports = userRepository;
