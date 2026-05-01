const entryRepository = require('../repositories/entry.repository');
const queueRepository = require('../repositories/queue.repository');
const prisma = require('../config/db');
const { getIO, broadcastPositionUpdates } = require('../socket/handler');

const entryService = {
  async getActiveEntry(userId) {
    return entryRepository.findActiveByUser(userId);
  },

  /**
   * USER: Join a queue
   * Enforces: one queue at a time, active queues only, capacity check
   */
  async joinQueue(userId, queueId, notifyAtPosition = 3) {
    const queue = await queueRepository.findById(queueId);
    if (!queue) throw { status: 404, message: 'Queue not found.' };

    // Only ACTIVE queues accept entries
    if (queue.status !== 'ACTIVE') {
      throw { status: 400, message: 'This queue is not accepting new entries.' };
    }

    // One queue at a time
    const activeEntry = await entryRepository.findActiveByUser(userId);
    if (activeEntry) {
      throw {
        status: 409,
        message: `You are already in a queue ("${activeEntry.queue.name}"). Leave your current queue before joining another.`,
      };
    }

    // Capacity check
    const waitingCount = await entryRepository.getWaitingCount(queueId);
    if (waitingCount >= queue.maxCapacity) {
      throw { status: 400, message: 'This queue is full.' };
    }

    // Join or rejoin queue in transaction
    const entry = await prisma.$transaction(async (tx) => {
      const existing = await tx.queueEntry.findUnique({
        where: { queueId_userId: { queueId, userId } }
      });

      if (existing) {
        // If they were already in the queue, we reset their record to 'WAITING' 
        // and update joinedAt to the current time so they go to the back of the line.
        return tx.queueEntry.update({
          where: { id: existing.id },
          data: {
            status: 'WAITING',
            joinedAt: new Date(),
            calledAt: null,
            completedAt: null,
            notifyAtPosition: notifyAtPosition || 3
          },
          include: {
            user: { select: { id: true, name: true, account: { select: { email: true } } } },
          },
        });
      }

      return tx.queueEntry.create({
        data: { queueId, userId, notifyAtPosition: notifyAtPosition || 3 },
        include: {
          user: { select: { id: true, name: true, account: { select: { email: true } } } },
        },
      });
    });

    const position = await entryRepository.getPosition(queueId, entry.joinedAt);
    const estimatedWait = Math.max(0, (position - 1) * queue.serviceRate);
    const newWaitingCount = await entryRepository.getWaitingCount(queueId);

    // Emit real-time event
    try {
      const io = getIO();
      io.to(queueId).emit('user-joined', {
        entry: entry,
        queueSize: newWaitingCount,
      });
    } catch (e) { /* Socket not initialized yet */ }

    return { entry, position, estimatedWait, waitingCount: newWaitingCount };
  },

  /**
   * USER: Get own position + ETA in a queue
   */
  async getPosition(userId, queueId) {
    const queue = await queueRepository.findById(queueId);
    if (!queue) throw { status: 404, message: 'Queue not found.' };

    const entry = await entryRepository.findActiveByQueueAndUser(queueId, userId);
    if (!entry) throw { status: 404, message: 'You are not in this queue.' };

    if (entry.status === 'CALLED') {
      return {
        position: 0,
        status: 'CALLED',
        message: "It's your turn! Please proceed.",
        estimatedWait: 0,
        queueStatus: queue.status,
      };
    }

    const position = await entryRepository.getPosition(queueId, entry.joinedAt);
    const estimatedWait = Math.max(0, (position - 1) * queue.serviceRate);

    return {
      position,
      status: entry.status,
      estimatedWait,
      queueStatus: queue.status,
      notifyAtPosition: entry.notifyAtPosition,
    };
  },

  /**
   * USER: Leave queue voluntarily
   */
  async leaveQueue(userId, queueId) {
    const entry = await entryRepository.findActiveByQueueAndUser(queueId, userId);
    if (!entry) throw { status: 404, message: 'You are not in this queue.' };

    await entryRepository.markAsLeft(entry.id);

    const waitingEntries = await entryRepository.findAllWaiting(queueId);
    const waitingCount = await entryRepository.getWaitingCount(queueId);
    const queue = await queueRepository.findById(queueId);

    // Emit real-time events
    try {
      const io = getIO();
      io.to(queueId).emit('user-left', {
        userId: entry.userId,
        queueSize: waitingCount,
      });
      broadcastPositionUpdates(queueId, waitingEntries, queue.serviceRate);
    } catch (e) { /* Socket not initialized yet */ }

    return {
      leftEntry: entry,
      waitingEntries,
      waitingCount,
      serviceRate: queue.serviceRate,
    };
  },

  /**
   * USER: Update notification preference
   */
  async updateNotifyAt(userId, queueId, notifyAtPosition) {
    if (!notifyAtPosition || notifyAtPosition < 1) {
      throw { status: 400, message: 'Notify position must be at least 1.' };
    }

    const entry = await entryRepository.findActiveByQueueAndUser(queueId, userId);
    if (!entry) throw { status: 404, message: 'You are not in this queue.' };

    return entryRepository.updateNotifyAt(queueId, userId, notifyAtPosition);
  },
};

module.exports = entryService;
