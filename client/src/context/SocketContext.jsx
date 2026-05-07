import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { initSocket } from '../utils/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

/**
 * Connection states for UI feedback:
 * - 'connected': Healthy, real-time updates flowing
 * - 'connecting': Initial connection or reconnecting after a drop
 * - 'disconnected': Lost connection, will auto-retry
 */

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const pendingRooms = useRef(new Set()); // Track rooms to rejoin after reconnect

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = initSocket(token);
      setConnectionStatus('connecting');

      // ─── Connection Lifecycle Events ──────────────────
      newSocket.on('connect', () => {
        console.log('⚡ Socket connected');
        setConnectionStatus('connected');
        setReconnectAttempt(0);

        // Rejoin all rooms we were in before the drop
        pendingRooms.current.forEach(roomId => {
          newSocket.emit('join-room', roomId);
          console.log(`📌 Re-joined room after reconnect: ${roomId}`);
        });
      });

      newSocket.on('disconnect', (reason) => {
        console.warn(`⚡ Socket disconnected: ${reason}`);
        setConnectionStatus('disconnected');
        // 'io server disconnect' means the server forced it — we need to manually reconnect
        if (reason === 'io server disconnect') {
          newSocket.connect();
        }
        // All other reasons (transport close, ping timeout) trigger automatic reconnection
      });

      newSocket.on('reconnect_attempt', (attempt) => {
        setConnectionStatus('connecting');
        setReconnectAttempt(attempt);
        console.log(`🔄 Socket reconnect attempt #${attempt}`);
      });

      newSocket.on('reconnect', (attempt) => {
        console.log(`✅ Socket reconnected after ${attempt} attempts`);
        setConnectionStatus('connected');
        setReconnectAttempt(0);
      });

      newSocket.on('reconnect_error', (error) => {
        console.warn('❌ Socket reconnect error:', error.message);
      });

      newSocket.on('connect_error', (error) => {
        console.warn('❌ Socket connect error:', error.message);
        setConnectionStatus('disconnected');
      });

      setSocket(newSocket);

      return () => {
        newSocket.removeAllListeners();
        newSocket.disconnect();
        setConnectionStatus('disconnected');
      };
    } else {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        setSocket(null);
        setConnectionStatus('disconnected');
        pendingRooms.current.clear();
      }
    }
  }, [isAuthenticated, token]);

  const joinQueueRoom = useCallback((queueId) => {
    pendingRooms.current.add(queueId); // Track for reconnect
    if (socket?.connected) {
      socket.emit('join-room', queueId);
    }
  }, [socket]);

  const leaveQueueRoom = useCallback((queueId) => {
    pendingRooms.current.delete(queueId);
    if (socket?.connected) {
      socket.emit('leave-room', queueId);
    }
  }, [socket]);

  const value = {
    socket,
    connectionStatus,
    reconnectAttempt,
    isConnected: connectionStatus === 'connected',
    isReconnecting: connectionStatus === 'connecting',
    joinQueueRoom,
    leaveQueueRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
