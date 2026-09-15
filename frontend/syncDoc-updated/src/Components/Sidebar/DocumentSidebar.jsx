import { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Tag,
  ChevronRight,
  Grid,
  Filter,
  Layers,
  Zap
} from 'lucide-react';

export function DocumentSidebar({
  documents,
  activeDocId,
  onSelectDoc,
  onCreateDoc,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const conflictsCount = documents.filter(d => d.status === 'conflict').length;

  const filteredDocuments = documents.filter(doc => {
    // Status filter
    if (activeFilter === 'conflict' && doc.status !== 'conflict') return false;
    if (activeFilter === 'synced' && doc.status !== 'synced') return false;
    if (activeFilter === 'draft' && doc.status !== 'draft') return false;

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchCategory = doc.category.toLowerCase().includes(q);
      const matchTags = doc.tags?.some(t => t.toLowerCase().includes(q));
      return matchTitle || matchCategory || matchTags;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'conflict':
        return (
          <span className="sidebar-status-pill conflict">
            <AlertTriangle size={12} />
            <span>AST Conflict</span>
          </span>
        );
      case 'synced':
        return (
          <span className="sidebar-status-pill synced">
            <CheckCircle2 size={12} />
            <span>Synced</span>
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="sidebar-status-pill draft">
            <Clock size={12} />
            <span>Draft</span>
          </span>
        );
    }
  };

  return (
    <aside className="sync-sidebar">
      {/* Brand Logo & App Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <Zap size={22} className="brand-zap-icon" />
        </div>
        <div className="brand-text">
          <span className="brand-name">SyncDoc</span>
          <span className="brand-tagline">AST Document Engine</span>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="sidebar-action-container">
        <button
          type="button"
          onClick={onCreateDoc}
          className="new-doc-primary-btn"
        >
          <Plus size={18} />
          <span>New AST Document</span>
        </button>
      </div>

      {/* Quick View Mode Switcher */}
      <div className="sidebar-view-toggle">
        <button
          type="button"
          className={`view-toggle-btn ${viewMode !== 'grid' ? 'active' : ''}`}
          onClick={() => onViewModeChange('editor')}
        >
          <FileText size={14} />
          <span>Editor</span>
        </button>
        <button
          type="button"
          className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => onViewModeChange('grid')}
        >
          <Grid size={14} />
          <span>Browse Grid</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="sidebar-search-wrapper">
        <Search size={15} className="search-icon" />
        <input
          type="text"
          placeholder="Search documents or AST tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sidebar-search-input"
        />
      </div>

      {/* Filter Tabs */}
      <div className="sidebar-filter-tabs">
        <button
          type="button"
          className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          <span>All</span>
          <span className="tab-count">{documents.length}</span>
        </button>
        <button
          type="button"
          className={`filter-tab conflict ${activeFilter === 'conflict' ? 'active' : ''}`}
          onClick={() => onFilterChange('conflict')}
        >
          <span>Conflicts</span>
          {conflictsCount > 0 && <span className="tab-count badge-alert">{conflictsCount}</span>}
        </button>
        <button
          type="button"
          className={`filter-tab ${activeFilter === 'synced' ? 'active' : ''}`}
          onClick={() => onFilterChange('synced')}
        >
          <span>Synced</span>
        </button>
        <button
          type="button"
          className={`filter-tab ${activeFilter === 'draft' ? 'active' : ''}`}
          onClick={() => onFilterChange('draft')}
        >
          <span>Drafts</span>
        </button>
      </div>

      {/* Document List */}
      <div className="sidebar-doc-list">
        <div className="list-section-header">
          <span>DOCUMENTS ({filteredDocuments.length})</span>
          <Filter size={12} />
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="empty-docs-state">
            <p>No documents found</p>
          </div>
        ) : (
          filteredDocuments.map(doc => {
            const isActive = doc.id === activeDocId && viewMode !== 'grid';
            const blockCount = doc.ast?.children?.length || 0;

            return (
              <div
                key={doc.id}
                className={`sidebar-doc-item ${isActive ? 'is-active' : ''} ${doc.status === 'conflict' ? 'has-conflict' : ''}`}
                onClick={() => onSelectDoc(doc.id)}
              >
                <div className="doc-item-main">
                  <div className="doc-title-row">
                    <FileText size={16} className="doc-icon" />
                    <span className="doc-title">{doc.title}</span>
                  </div>

                  <div className="doc-meta-row">
                    <span className="doc-category">{doc.category}</span>
                    <span className="dot-divider">•</span>
                    <span className="doc-block-count">{blockCount} blocks</span>
                  </div>

                  <div className="doc-badges-row">
                    {getStatusBadge(doc.status)}
                    {doc.tags?.[0] && (
                      <span className="tag-pill">
                        <Tag size={10} />
                        {doc.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={14} className="arrow-icon" />
              </div>
            );
          })
        )}
      </div>

      {/* AST Stats Footer */}
      <div className="sidebar-footer-stats">
        <div className="stat-card">
          <Layers size={14} className="stat-icon" />
          <div className="stat-info">
            <span className="stat-value">AST v2.4</span>
            <span className="stat-label">CRDT Block Engine</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
