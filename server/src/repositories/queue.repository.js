const prisma = require('../config/db');

const queueRepository = {
  async findByOrgId(orgId) {
    return prisma.queue.findMany({ where: { orgId } });
  },

  async findById(id) {
    return prisma.queue.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true, description: true } },
      },
    });
  },

  async create(orgId, { name, maxCapacity, serviceRate }) {
    return prisma.queue.create({
      data: {
        name,
        orgId,
        maxCapacity: maxCapacity || 100,
        serviceRate: serviceRate || 2.0,
      },
    });
  },

  async updateStatus(id, status) {
    return prisma.queue.update({
      where: { id },
      data: { status },
    });
  },

  async delete(id) {
    return prisma.queue.delete({ where: { id } });
  },

  /**
   * ORG dashboard — queue with all active entries + user details
   */
  async findWithEntries(queueId) {
    return prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        entries: {
          where: { status: { in: ['WAITING', 'CALLED'] } },
          orderBy: { joinedAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, account: { select: { email: true } } } },
          },
        },
        organization: { select: { name: true } },
      },
    });
  },

  /**
   * USER browse — all non-closed queues with waiting counts
   */
  async findAllWithStats() {
    return prisma.queue.findMany({
      where: { status: { not: 'CLOSED' } },
      include: {
        organization: { select: { name: true, description: true } },
        _count: {
          select: { entries: { where: { status: 'WAITING' } } },
        },
      },
    });
  },

  /**
   * USER — single queue details with waiting count
   */
  async findByIdWithStats(id) {
    return prisma.queue.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true, description: true } },
        _count: {
          select: { entries: { where: { status: 'WAITING' } } },
        },
      },
    });
  },
};

module.exports = queueRepository;
