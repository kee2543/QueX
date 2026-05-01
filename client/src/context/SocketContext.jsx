import { createContext, useContext, useEffect, useState } from 'react';
import { initSocket } from '../utils/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = initSocket(token);
      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
        if(socket) {
            socket.disconnect();
            setSocket(null);
        }
    }
  }, [isAuthenticated, token]);

  const joinQueueRoom = (queueId) => {
    if (socket) {
      socket.emit('join-room', queueId);
    }
  };

  const leaveQueueRoom = (queueId) => {
    if (socket) {
      socket.emit('leave-room', queueId);
    }
  };

  const value = {
    socket,
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
