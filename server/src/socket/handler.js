const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

/**
 * Initialize Socket.IO with the HTTP server.
 * Sets up JWT auth for socket connections and room management.
 */
function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // ─── Socket Auth Middleware ─────────────────────────────
  // Verifies JWT before allowing connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, email, role }
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ─────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.user.email} (${socket.user.role})`);

    // Client joins a queue room to receive updates for that queue
    socket.on('join-room', (queueId) => {
      socket.join(queueId);
      console.log(`📌 ${socket.user.email} joined room: ${queueId}`);
    });

    // Client leaves a queue room
    socket.on('leave-room', (queueId) => {
      socket.leave(queueId);
      console.log(`📌 ${socket.user.email} left room: ${queueId}`);
    });

    socket.on('disconnect', () => {
      console.log(`⚡ Socket disconnected: ${socket.user.email}`);
    });
  });

  console.log('🔌 Socket.IO initialized');
  return io;
}

/**
 * Get the Socket.IO instance (must be called after initializeSocket)
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
}

// ─── Position-Based Notification Logic ────────────────────

const DEFAULT_ALERTS = {
  5: "Heads up! You're 5th in line — start heading over",
  3: "Almost there! You're 3rd in line",
  2: "Get ready! You're next after the current person",
  1: "You're NEXT! Please be ready",
};

/**
 * Check each waiting user's new position and send notifications.
 * Emits 'position-update' to each user and 'notification' at threshold positions.
 *
 * @param {string} queueId - The queue room to broadcast to
 * @param {Array} waitingEntries - Ordered list of waiting entries with user details
 * @param {number} serviceRate - Queue's service rate (users/min)
 */
function broadcastPositionUpdates(queueId, waitingEntries, serviceRate) {
  const socketIO = getIO();

  waitingEntries.forEach((entry, index) => {
    const position = index + 1; // 1-indexed
    const estimatedWait = Math.max(0, (position - 1) * serviceRate);

    // Broadcast position update to the queue room
    // Each client filters by their own userId
    socketIO.to(queueId).emit('position-update', {
      userId: entry.userId,
      position,
      estimatedWait,
      queueId,
    });

    // Check default alert positions (5, 3, 2, 1)
    if (DEFAULT_ALERTS[position]) {
      socketIO.to(queueId).emit('notification', {
        type: 'position_alert',
        userId: entry.userId,
        position,
        message: DEFAULT_ALERTS[position],
      });
    }

    // Check custom threshold
    if (
      entry.notifyAtPosition &&
      position === entry.notifyAtPosition &&
      !DEFAULT_ALERTS[position] // avoid duplicate if it's already a default
    ) {
      socketIO.to(queueId).emit('notification', {
        type: 'custom_alert',
        userId: entry.userId,
        position,
        message: `You're at position ${position} — your custom alert has been triggered!`,
      });
    }
  });
}

module.exports = { initializeSocket, getIO, broadcastPositionUpdates };
