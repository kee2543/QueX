import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, Info } from 'lucide-react';

export default function NotificationToast() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data) => {
      const newNotification = {
        id: Date.now(),
        message: data.message,
        type: data.type || 'info',
      };
      
      setNotifications(prev => [...prev, newNotification]);

      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    };

    socket.on('notification', handleNotification);
    socket.on('queue-deleted', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('queue-deleted', handleNotification);
    };
  }, [socket]);

  if (notifications.length === 0) return null;

  return (
    <div className="toast-container">
      {notifications.map(notification => (
        <div key={notification.id} className="toast">
          {notification.type === 'position_alert' ? (
            <Bell className="toast-icon" size={20} color="var(--color-primary)" />
          ) : (
            <Info className="toast-icon" size={20} color="var(--color-info)" />
          )}
          <span className="toast-message">{notification.message}</span>
        </div>
      ))}
    </div>
  );
}
