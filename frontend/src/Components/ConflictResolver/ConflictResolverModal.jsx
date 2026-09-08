import {
  AlertTriangle,
  X,
  Check,
  GitMerge,
  User,
  Clock,
  Layers,
  ShieldCheck
} from 'lucide-react';

export function ConflictResolverModal({
  block,
  onClose,
  onResolveConflict
}) {
  if (!block || !block.conflict) return null;

  const conflict = block.conflict;
  const localNode = conflict.localNode || block;
  const remoteNode = conflict.remoteNode;

  const handleChooseLocal = () => {
    onResolveConflict(block.id, localNode);
  };

  const handleChooseRemote = () => {
    onResolveConflict(block.id, remoteNode);
  };

  const handleChooseMerged = () => {
    // Merge both code content
    const localContent = typeof localNode.content === 'string' ? localNode.content : '';
    const remoteContent = typeof remoteNode.content === 'string' ? remoteNode.content : '';

    const mergedContent = `// Merged AST Code Block\n${localContent}\n\n// Remote Additions\n${remoteContent}`;

    const mergedNode = {
      ...localNode,
      content: mergedContent,
      version: Math.max(localNode.version || 1, remoteNode.version || 1) + 1
    };

    onResolveConflict(block.id, mergedNode);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="conflict-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-title-flex">
            <div className="alert-icon-ring">
              <AlertTriangle size={22} className="alert-icon" />
            </div>
            <div>
              <h2>AST Block Conflict Resolution</h2>
              <p>Block ID: <code>#{block.id}</code> • Version Vector Divergence Detected</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="close-modal-btn">
            <X size={20} />
          </button>
        </div>

        {/* Conflict Overview Info */}
        <div className="conflict-meta-banner">
          <div className="meta-item">
            <Clock size={14} />
            <span>Timestamp: {new Date(conflict.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="meta-item">
            <Layers size={14} />
            <span>Node Type: {block.type}</span>
          </div>
          <div className="meta-item">
            <GitMerge size={14} />
            <span>Conflict Type: {conflict.type || 'content_mismatch'}</span>
          </div>
        </div>

        {/* Side by Side Diff Comparison */}
        <div className="conflict-diff-grid">
          {/* Local Node Panel */}
          <div className="diff-panel local">
            <div className="panel-badge-bar">
              <span className="author-tag">
                <User size={13} />
                {conflict.authorLocal || 'Alex Rivers (Local)'}
              </span>
              <span className="version-tag">v{localNode.version || 8}</span>
            </div>

            <div className="panel-content-box">
              <div className="content-label">Local AST Node Content:</div>
              <pre className="diff-code-pre">
                <code>{typeof localNode.content === 'string' ? localNode.content : JSON.stringify(localNode.content, null, 2)}</code>
              </pre>
            </div>

            <button
              type="button"
              className="resolve-choice-btn local-btn"
              onClick={handleChooseLocal}
            >
              <Check size={16} />
              <span>Keep Mine (Local AST)</span>
            </button>
          </div>

          {/* Remote Node Panel */}
          <div className="diff-panel remote">
            <div className="panel-badge-bar">
              <span className="author-tag remote">
                <User size={13} />
                {conflict.authorRemote || 'Elena Rostova (Remote)'}
              </span>
              <span className="version-tag">v{remoteNode.version || 9}</span>
            </div>

            <div className="panel-content-box">
              <div className="content-label">Remote AST Node Content:</div>
              <pre className="diff-code-pre remote">
                <code>{typeof remoteNode.content === 'string' ? remoteNode.content : JSON.stringify(remoteNode.content, null, 2)}</code>
              </pre>
            </div>

            <button
              type="button"
              className="resolve-choice-btn remote-btn"
              onClick={handleChooseRemote}
            >
              <Check size={16} />
              <span>Keep Theirs (Remote AST)</span>
            </button>
          </div>
        </div>

        {/* Automated AST Merge Action */}
        <div className="merge-action-footer">
          <div className="merge-info">
            <ShieldCheck size={18} className="merge-icon" />
            <div>
              <div className="merge-title">Smart AST Synthesizer</div>
              <div className="merge-sub">Combine both versions into a unified code block AST node</div>
            </div>
          </div>
          <button
            type="button"
            className="smart-merge-btn"
            onClick={handleChooseMerged}
          >
            <GitMerge size={16} />
            <span>Synthesize & Merge AST</span>
          </button>
        </div>
      </div>
    </div>
  );
}
