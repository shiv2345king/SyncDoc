import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Radio, 
  Cpu
} from 'lucide-react';

export function YjsConnectionStatus({ 
  status, 
  roomName, 
  clientId, 
  onReconnect, 
  onDisconnect 
}) {
  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <div className="yjs-status-pill connected" title="Yjs WebSocket Server Connected">
            <Radio size={14} className="wifi-icon pulse-active" />
            <span>Yjs WS: Connected</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="yjs-status-pill connecting" title="Connecting to Yjs WebSocket Server...">
            <RefreshCw size={14} className="spin-icon" />
            <span>Yjs WS: Connecting...</span>
          </div>
        );
      case 'disconnected':
      default:
        return (
          <div className="yjs-status-pill disconnected" title="WebSocket Disconnected">
            <WifiOff size={14} />
            <span>Yjs WS: Offline</span>
          </div>
        );
    }
  };

  return (
    <div className="yjs-connection-status-bar">
      {getStatusBadge()}

      <div className="yjs-info-chip">
        <Cpu size={12} />
        <span>Room: <code>{roomName || 'default'}</code></span>
      </div>

      <div className="yjs-info-chip">
        <span>Client ID: <code>#{clientId || '0'}</code></span>
      </div>

      {status === 'disconnected' ? (
        <button 
          type="button" 
          onClick={onReconnect} 
          className="ws-action-btn connect"
        >
          <Wifi size={12} />
          <span>Connect WS</span>
        </button>
      ) : (
        <button 
          type="button" 
          onClick={onDisconnect} 
          className="ws-action-btn disconnect"
        >
          <WifiOff size={12} />
          <span>Disconnect</span>
        </button>
      )}
    </div>
  );
}
