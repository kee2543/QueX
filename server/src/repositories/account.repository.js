const prisma = require('../config/db');

const accountRepository = {
  async findByEmail(email) {
    return prisma.account.findUnique({ where: { email } });
  },

  async findById(id) {
    return prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  },

  async create({ email, password, role }) {
    return prisma.account.create({
      data: { email, password, role },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  },

  async update(id, data) {
    return prisma.account.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  },
};

module.exports = accountRepository;
