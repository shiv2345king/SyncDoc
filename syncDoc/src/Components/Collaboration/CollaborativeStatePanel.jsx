import { useState } from 'react';
import {
  Activity,
  Radio,
  Users,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Check,
  Zap,
  Globe
} from 'lucide-react';

export function CollaborativeStatePanel({
  status,
  roomName,
  clientId,
  presenceUsers,
  activeDoc,
  onSimulatePeer,
  onReconnect
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const blockCount = activeDoc?.ast?.children?.length || 0;

  return (
    <div className="collaborative-state-panel">
      <div
        className="panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="header-left">
          <Activity size={16} className="state-icon" />
          <span className="panel-title">Yjs Collaboration Engine</span>
          <span className={`status-dot ${status}`} />
        </div>

        <div className="header-right">
          <span className="peers-count-pill">{presenceUsers.length} Peers Active</span>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {isExpanded && (
        <div className="panel-body">
          {/* Section 1: Yjs Engine Status */}
          <div className="state-section">
            <div className="section-title">
              <Radio size={13} />
              <span>WebSocket Sync Protocol</span>
            </div>

            <div className="state-metrics-grid">
              <div className="metric-box">
                <span className="metric-label">Connection Status</span>
                <span className={`metric-value status-${status}`}>
                  {status === 'connected' ? 'WebSocket Live' : status === 'connecting' ? 'Connecting...' : 'Offline'}
                </span>
              </div>

              <div className="metric-box">
                <span className="metric-label">Room Identifier</span>
                <span className="metric-value code">
                  <Globe size={11} className="inline-icon" /> {roomName || 'syncdoc-room'}
                </span>
              </div>

              <div className="metric-box">
                <span className="metric-label">Yjs Client ID</span>
                <span className="metric-value code">#{clientId || '0'}</span>
              </div>

              <div className="metric-box">
                <span className="metric-label">AST Shared Blocks</span>
                <span className="metric-value highlight">{blockCount} Nodes</span>
              </div>
            </div>
          </div>

          {/* Section 2: Presence Roster */}
          <div className="state-section">
            <div className="section-title">
              <Users size={13} />
              <span>Live Peer Presence Indicators ({presenceUsers.length})</span>
            </div>

            <div className="presence-roster">
              {presenceUsers.map((peer, idx) => (
                <div key={peer.id || idx} className="roster-item">
                  <div className="roster-avatar-box">
                    <img src={peer.avatar} alt={peer.name} className="roster-avatar" />
                    <span className="roster-status-ring" style={{ backgroundColor: peer.color || '#6366f1' }} />
                  </div>

                  <div className="roster-info">
                    <div className="roster-name">{peer.name}</div>
                    <div className="roster-activity">
                      {peer.cursorBlockId ? (
                        <span className="editing-tag">
                          <Zap size={10} /> Active on #{peer.cursorBlockId}
                        </span>
                      ) : (
                        <span className="idle-tag">
                          <Check size={10} /> Synced & Listening
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="panel-actions-row">
            <button
              type="button"
              className="collab-action-btn primary"
              onClick={() => onSimulatePeer(activeDoc?.ast?.children)}
            >
              <Sparkles size={14} />
              <span>Simulate Peer Activity</span>
            </button>

            {status !== 'connected' && (
              <button
                type="button"
                className="collab-action-btn secondary"
                onClick={onReconnect}
              >
                <Radio size={14} />
                <span>Reconnect WebSocket</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
