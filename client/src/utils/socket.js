import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

/**
 * Initialize a resilient Socket.IO connection with built-in reconnection
 * to survive WebSocket drops injected by the Chaos Middleware.
 *
 * Socket.IO has its own reconnection engine — we configure it aggressively
 * to handle packet-loss and connection-drop scenarios.
 */
export const initSocket = (token) => {
  return io(SOCKET_URL, {
    auth: {
      token
    },
    transports: ['websocket', 'polling'], // Fallback to polling if WS is dropped
    reconnection: true,
    reconnectionAttempts: Infinity,        // Never give up reconnecting
    reconnectionDelay: 1000,               // Start with 1s delay
    reconnectionDelayMax: 10000,           // Cap at 10s between attempts
    randomizationFactor: 0.5,              // Jitter to prevent thundering herd
    timeout: 15000,                        // 15s connection timeout
    pingTimeout: 10000,                    // 10s before considering a connection dead
    pingInterval: 5000,                    // Heartbeat every 5s to detect drops early
  });
};
