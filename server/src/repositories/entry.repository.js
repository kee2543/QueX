const prisma = require('../config/db');

const entryRepository = {
  /**
   * Check if user has an active entry in ANY queue (one queue at a time rule)
   */
  async findActiveByUser(userId) {
    return prisma.queueEntry.findFirst({
      where: {
        userId,
        status: { in: ['WAITING', 'CALLED'] },
      },
      include: {
        queue: { select: { name: true } },
      },
    });
  },

  /**
   * Check if user already in this specific queue (any status)
   */
  async findByQueueAndUser(queueId, userId) {
    return prisma.queueEntry.findUnique({
      where: { queueId_userId: { queueId, userId } },
    });
  },

  /**
   * Find active entry for user in a specific queue
   */
  async findActiveByQueueAndUser(queueId, userId) {
    return prisma.queueEntry.findFirst({
      where: {
        queueId,
        userId,
        status: { in: ['WAITING', 'CALLED'] },
      },
    });
  },

  /**
   * Create a new queue entry
   */
  async create(queueId, userId, notifyAtPosition = 3) {
    return prisma.queueEntry.create({
      data: { queueId, userId, notifyAtPosition },
      include: {
        user: { select: { id: true, name: true, account: { select: { email: true } } } },
      },
    });
  },

  /**
   * Calculate position — count of WAITING entries that joined before this one
   */
  async getPosition(queueId, joinedAt) {
    const count = await prisma.queueEntry.count({
      where: {
        queueId,
        status: 'WAITING',
        joinedAt: { lt: joinedAt },
      },
    });
    return count + 1; // 1-indexed
  },

  /**
   * Total waiting count for a queue
   */
  async getWaitingCount(queueId) {
    return prisma.queueEntry.count({
      where: { queueId, status: 'WAITING' },
    });
  },

  /**
   * Find next WAITING entry (FIFO — earliest joinedAt)
   */
  async findNextWaiting(queueId) {
    return prisma.queueEntry.findFirst({
      where: { queueId, status: 'WAITING' },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, account: { select: { email: true } } } },
      },
    });
  },

  /**
   * Mark entry as CALLED
   */
  async markAsCalled(id) {
    return prisma.queueEntry.update({
      where: { id },
      data: { status: 'CALLED', calledAt: new Date() },
      include: {
        user: { select: { id: true, name: true, account: { select: { email: true } } } },
      },
    });
  },

  /**
   * Mark entry as LEFT
   */
  async markAsLeft(id) {
    return prisma.queueEntry.update({
      where: { id },
      data: { status: 'LEFT', completedAt: new Date() },
    });
  },

  /**
   * Find entry by ID
   */
  async findById(id) {
    return prisma.queueEntry.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, account: { select: { email: true } } } },
      },
    });
  },

  /**
   * Get all waiting entries ordered by joinedAt (for position broadcasts)
   */
  async findAllWaiting(queueId) {
    return prisma.queueEntry.findMany({
      where: { queueId, status: 'WAITING' },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, account: { select: { email: true } } } },
      },
    });
  },

  /**
   * Mark all active entries as LEFT (for queue deletion)
   */
  async markAllAsLeft(queueId) {
    return prisma.queueEntry.updateMany({
      where: {
        queueId,
        status: { in: ['WAITING', 'CALLED'] },
      },
      data: { status: 'LEFT', completedAt: new Date() },
    });
  },

  /**
   * Update notification preference
   */
  async updateNotifyAt(queueId, userId, notifyAtPosition) {
    return prisma.queueEntry.update({
      where: { queueId_userId: { queueId, userId } },
      data: { notifyAtPosition },
    });
  },
};

module.exports = entryRepository;
