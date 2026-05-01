const queueRepository = require('../repositories/queue.repository');
const entryRepository = require('../repositories/entry.repository');
const orgRepository = require('../repositories/org.repository');
const prisma = require('../config/db');
const { getIO, broadcastPositionUpdates } = require('../socket/handler');

const queueService = {
  // ─── ORG Methods ──────────────────────────────────────

  async createQueue(orgId, { name, maxCapacity, serviceRate }) {
    const existingQueues = await queueRepository.findByOrgId(orgId);
    if (existingQueues.length >= 5) {
      throw { status: 400, message: 'You can have a maximum of 5 queues at most.' };
    }

    return queueRepository.create(orgId, { name, maxCapacity, serviceRate });
  },

  async getOwnQueues(orgId) {
    const queues = await queueRepository.findByOrgId(orgId);
    
    // For each queue, get entries and waiting count
    const queuesWithDetails = await Promise.all(queues.map(async (q) => {
      const queueWithEntries = await queueRepository.findWithEntries(q.id);
      const waitingCount = await entryRepository.getWaitingCount(q.id);
      return { ...queueWithEntries, waitingCount };
    }));

    return queuesWithDetails;
  },

  async getOneOwnQueue(orgId, queueId) {
    const queue = await queueRepository.findById(queueId);
    if (!queue || queue.orgId !== orgId) {
      throw { status: 404, message: 'Queue not found or unauthorized.' };
    }

    const queueWithEntries = await queueRepository.findWithEntries(queueId);
    const waitingCount = await entryRepository.getWaitingCount(queueId);

    return { ...queueWithEntries, waitingCount };
  },

  async updateQueueStatus(orgId, queueId, status) {
    if (!['ACTIVE', 'PAUSED', 'CLOSED'].includes(status)) {
      throw { status: 400, message: 'Status must be ACTIVE, PAUSED, or CLOSED.' };
    }

    const queue = await queueRepository.findById(queueId);
    if (!queue || queue.orgId !== orgId) {
      throw { status: 404, message: 'Queue not found or unauthorized.' };
    }

    const updatedQueue = await queueRepository.updateStatus(queue.id, status);

    try {
      const io = getIO();
      io.to(queue.id).emit('queue-status-changed', { queueId: queue.id, status });
    } catch (e) { /* Socket not initialized yet */ }

    return updatedQueue;
  },

  async callNext(orgId, queueId) {
    const queue = await queueRepository.findById(queueId);
    if (!queue || queue.orgId !== orgId) {
      throw { status: 404, message: 'Queue not found or unauthorized.' };
    }

    if (queue.status !== 'ACTIVE') {
      throw { status: 400, message: 'Queue must be ACTIVE to call next user.' };
    }

    const nextEntry = await entryRepository.findNextWaiting(queue.id);
    if (!nextEntry) {
      throw { status: 404, message: 'No users waiting in queue.' };
    }

    const calledEntry = await prisma.$transaction(async (tx) => {
      return tx.queueEntry.update({
        where: { id: nextEntry.id },
        data: { status: 'CALLED', calledAt: new Date() },
        include: {
          user: { select: { id: true, name: true, account: { select: { email: true } } } },
        },
      });
    });

    const waitingEntries = await entryRepository.findAllWaiting(queue.id);
    const waitingCount = await entryRepository.getWaitingCount(queue.id);

    try {
      const io = getIO();
      io.to(queue.id).emit('user-called', {
        calledUser: calledEntry.user,
        queueSize: waitingCount,
      });
      broadcastPositionUpdates(queue.id, waitingEntries, queue.serviceRate);
    } catch (e) { /* Socket not initialized yet */ }

    return {
      calledEntry,
      waitingEntries,
      waitingCount,
      serviceRate: queue.serviceRate,
    };
  },

  async removeEntry(orgId, queueId, entryId) {
    const queue = await queueRepository.findById(queueId);
    if (!queue || queue.orgId !== orgId) {
      throw { status: 404, message: 'Queue not found or unauthorized.' };
    }

    const entry = await entryRepository.findById(entryId);
    if (!entry || entry.queueId !== queue.id) {
      throw { status: 404, message: 'Entry not found in your queue.' };
    }

    if (entry.status !== 'WAITING' && entry.status !== 'CALLED') {
      throw { status: 400, message: 'This entry is no longer active.' };
    }

    await entryRepository.markAsLeft(entryId);

    const waitingEntries = await entryRepository.findAllWaiting(queue.id);
    const waitingCount = await entryRepository.getWaitingCount(queue.id);

    try {
      const io = getIO();
      io.to(queue.id).emit('user-left', {
        userId: entry.userId,
        queueSize: waitingCount,
      });
      broadcastPositionUpdates(queue.id, waitingEntries, queue.serviceRate);
    } catch (e) { /* Socket not initialized yet */ }

    return {
      removedEntry: entry,
      waitingEntries,
      waitingCount,
      serviceRate: queue.serviceRate,
    };
  },

  async deleteQueue(orgId, queueId) {
    const queue = await queueRepository.findById(queueId);
    if (!queue || queue.orgId !== orgId) {
      throw { status: 404, message: 'Queue not found or unauthorized.' };
    }

    const activeEntries = await entryRepository.findAllWaiting(queue.id);

    await prisma.$transaction(async (tx) => {
      await tx.queueEntry.updateMany({
        where: { queueId: queue.id, status: { in: ['WAITING', 'CALLED'] } },
        data: { status: 'LEFT', completedAt: new Date() },
      });
      await tx.queue.delete({ where: { id: queue.id } });
    });

    try {
      const io = getIO();
      io.to(queue.id).emit('queue-deleted', {
        queueId: queue.id,
        message: 'The queue has been closed by the organization.',
      });
    } catch (e) { /* Socket not initialized yet */ }

    return { deletedQueueId: queue.id, affectedEntries: activeEntries };
  },

  // ─── USER Methods ─────────────────────────────────────

  async browseQueues() {
    const queues = await queueRepository.findAllWithStats();
    return queues.map((q) => ({
      id: q.id,
      name: q.name,
      status: q.status,
      maxCapacity: q.maxCapacity,
      serviceRate: q.serviceRate,
      orgName: q.organization.name,
      orgDescription: q.organization.description,
      waitingCount: q._count.entries,
      estimatedWait: q._count.entries * q.serviceRate,
    }));
  },

  async getQueueDetails(queueId) {
    const queue = await queueRepository.findByIdWithStats(queueId);
    if (!queue) throw { status: 404, message: 'Queue not found.' };

    return {
      id: queue.id,
      name: queue.name,
      status: queue.status,
      maxCapacity: queue.maxCapacity,
      serviceRate: queue.serviceRate,
      orgName: queue.organization.name,
      orgDescription: queue.organization.description,
      waitingCount: queue._count.entries,
    };
  },
};

module.exports = queueService;
