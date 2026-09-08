import { useState } from 'react';
import {
  FileText,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  Split,
  Code,
  Sun,
  Moon,
  Activity
} from 'lucide-react';
import { YjsConnectionStatus } from '../Collaboration/YjsConnectionStatus';
import { UserPresenceBar } from '../Collaboration/UserPresenceBar';

export function DocumentHeader({
  document,
  onUpdateTitle,
  onOpenConflictModal,
  onOpenNewBlockModal,
  onExportAstJson,
  viewMode,
  onViewModeChange,
  isDarkMode,
  onToggleTheme,
  yjsStatus,
  yjsClientId,
  presenceUsers = [],
  onSimulatePeer,
  onReconnectYjs,
  onDisconnectYjs,
  showCollabState,
  onToggleCollabState
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(document?.title || '');

  if (!document) return null;

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleText.trim() && onUpdateTitle) {
      onUpdateTitle(titleText.trim());
    }
  };

  const hasConflict = document.status === 'conflict';

  return (
    <header className="sync-document-header">
      {/* Top Row: Title & Metadata */}
      <div className="header-top-row">
        <div className="title-and-tags">
          <div className="category-tag-badge">
            <Layers size={13} />
            <span>{document.category || 'Document'}</span>
          </div>

          <div className="document-title-container">
            {isEditingTitle ? (
              <input
                type="text"
                className="header-title-input"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
              />
            ) : (
              <h1
                className="document-main-heading"
                onClick={() => {
                  setTitleText(document.title);
                  setIsEditingTitle(true);
                }}
                title="Click to edit document title"
              >
                {document.title}
              </h1>
            )}
          </div>
        </div>

        {/* Sync Status Badge & Action Shortcuts */}
        <div className="header-status-and-collabs">
          <YjsConnectionStatus
            status={yjsStatus}
            roomName={document.id}
            clientId={yjsClientId}
            onReconnect={onReconnectYjs}
            onDisconnect={onDisconnectYjs}
          />

          <UserPresenceBar
            presenceUsers={presenceUsers}
            onSimulatePeer={onSimulatePeer}
            activeDocBlocks={document.ast?.children}
          />

          {hasConflict ? (
            <button
              type="button"
              className="sync-status-badge conflict-pulse"
              onClick={onOpenConflictModal}
              title="Click to resolve AST conflict"
            >
              <AlertTriangle size={15} />
              <span>AST Conflict Active</span>
              <span className="resolve-pill-action">Resolve Now</span>
            </button>
          ) : (
            <div className="sync-status-badge synced">
              <CheckCircle2 size={15} />
              <span>Real-Time AST Synced</span>
            </div>
          )}

          <button
            type="button"
            className={`collab-dashboard-toggle-btn ${showCollabState ? 'active' : ''}`}
            onClick={onToggleCollabState}
            title="Toggle Yjs Collaborative Dashboard"
          >
            <Activity size={16} />
            <span>Dashboard</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Bottom Row: View Mode Tabs & Primary Actions */}
      <div className="header-bottom-row">
        <div className="view-mode-tabs">
          <button
            type="button"
            className={`mode-tab ${viewMode === 'editor' ? 'active' : ''}`}
            onClick={() => onViewModeChange('editor')}
          >
            <FileText size={15} />
            <span>Document Canvas</span>
          </button>

          <button
            type="button"
            className={`mode-tab ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => onViewModeChange('split')}
          >
            <Split size={15} />
            <span>Split AST View</span>
          </button>

          <button
            type="button"
            className={`mode-tab ${viewMode === 'ast-tree' ? 'active' : ''}`}
            onClick={() => onViewModeChange('ast-tree')}
          >
            <Code size={15} />
            <span>AST Node Tree</span>
          </button>
        </div>

        <div className="header-primary-actions">
          <button
            type="button"
            className="header-btn secondary"
            onClick={onExportAstJson}
            title="Export AST Structure as JSON"
          >
            <Download size={15} />
            <span>Export AST JSON</span>
          </button>

          <button
            type="button"
            className="header-btn primary"
            onClick={onOpenNewBlockModal}
          >
            <Plus size={16} />
            <span>Add AST Block</span>
          </button>
        </div>
      </div>
    </header>
  );
}
