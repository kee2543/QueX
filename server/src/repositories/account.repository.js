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
        authProvider: true,
        createdAt: true,
      },
    });
  },

  async create({ email, password, role, authProvider = 'LOCAL' }) {
    return prisma.account.create({
      data: { email, password, role, authProvider },
      select: {
        id: true,
        email: true,
        role: true,
        authProvider: true,
        createdAt: true,
      },
    });
  },

  /**
   * Find an account by email, or create it if it doesn't exist.
   * Used by OAuth and OTP flows where the user may not have registered yet.
   */
  async upsertByEmail({ email, role, authProvider }) {
    return prisma.account.upsert({
      where: { email },
      update: {},  // Don't overwrite existing accounts
      create: { email, role, authProvider },
      select: {
        id: true,
        email: true,
        role: true,
        authProvider: true,
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
        authProvider: true,
        createdAt: true,
      },
    });
  },
};

module.exports = accountRepository;
