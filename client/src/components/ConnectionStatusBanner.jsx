import { useSocket } from '../context/SocketContext';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * A global banner that appears when the WebSocket connection is disrupted.
 * Helps users understand that real-time updates may be stale during chaos events.
 */
export default function ConnectionStatusBanner() {
  const { connectionStatus, reconnectAttempt, isConnected } = useSocket();

  // Don't show anything when connected — no noise
  if (isConnected) return null;

  const isReconnecting = connectionStatus === 'connecting';

  return (
    <div className={`connection-banner ${isReconnecting ? 'reconnecting' : 'disconnected'}`}>
      <div className="connection-banner-content">
        {isReconnecting ? (
          <>
            <RefreshCw size={16} className="connection-banner-icon spin" />
            <span>
              Reconnecting to server{reconnectAttempt > 0 ? ` (attempt ${reconnectAttempt})` : ''}...
            </span>
          </>
        ) : (
          <>
            <WifiOff size={16} className="connection-banner-icon" />
            <span>Connection lost. Real-time updates paused.</span>
          </>
        )}
      </div>
    </div>
  );
}
