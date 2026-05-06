const prisma = require('../config/db');

const otpRepository = {
  /**
   * Create a new OTP record for the given account.
   */
  async create(accountId, code, expiresAt) {
    return prisma.otp.create({
      data: { accountId, code, expiresAt },
    });
  },

  /**
   * Find the latest unused, non-expired OTP for the given account.
   */
  async findLatestValid(accountId) {
    return prisma.otp.findFirst({
      where: {
        accountId,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Mark an OTP as used.
   */
  async markUsed(id) {
    return prisma.otp.update({
      where: { id },
      data: { used: true },
    });
  },

  /**
   * Increment the attempt count for an OTP.
   */
  async incrementAttempts(id) {
    return prisma.otp.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  },

  /**
   * Invalidate all unused OTPs for a given account (cleanup on new OTP send).
   */
  async invalidateAll(accountId) {
    return prisma.otp.updateMany({
      where: { accountId, used: false },
      data: { used: true },
    });
  },
};

module.exports = otpRepository;
