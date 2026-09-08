import {
  Users,
  UserPlus,
  Sparkles,
  MousePointer2
} from 'lucide-react';

export function UserPresenceBar({
  presenceUsers,
  onSimulatePeer,
  activeDocBlocks
}) {
  return (
    <div className="user-presence-bar">
      <div className="presence-label">
        <Users size={14} className="presence-icon" />
        <span>Collaborative Peers ({presenceUsers.length})</span>
      </div>

      <div className="presence-avatars-list">
        {presenceUsers.map((user, idx) => (
          <div
            key={user.id || idx}
            className="presence-avatar-item"
            style={{ '--peer-color': user.color || '#6366f1' }}
          >
            <div className="avatar-wrapper">
              <img
                src={user.avatar}
                alt={user.name}
                className="peer-avatar"
              />
              <span className="online-dot-pulse" style={{ backgroundColor: user.color }} />
            </div>

            {/* Hover Presence Card */}
            <div className="presence-hover-tooltip">
              <div className="tooltip-name">{user.name}</div>
              <div className="tooltip-meta">
                <span className="client-badge">ID: #{user.id}</span>
                {user.cursorBlockId ? (
                  <div className="editing-block-badge">
                    <MousePointer2 size={11} />
                    <span>Editing block #{user.cursorBlockId}</span>
                  </div>
                ) : (
                  <span className="idle-badge">Browsing document</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simulate Active Peer Button */}
      <button
        type="button"
        className="simulate-peer-btn"
        onClick={() => onSimulatePeer(activeDocBlocks)}
        title="Simulate a remote peer joining & editing blocks in real-time"
      >
        <UserPlus size={13} />
        <Sparkles size={11} />
        <span>Simulate Peer Join</span>
      </button>
    </div>
  );
}
