import {
  AlertTriangle,
  CheckCircle2,
  Tag,
  Plus,
  Trash2,
  Layers,
  ArrowRight,
  User
} from 'lucide-react';

export function DocumentGridView({
  documents,
  onSelectDoc,
  onCreateDoc,
  onDeleteDoc
}) {
  return (
    <div className="doc-grid-container">
      <div className="grid-header-row">
        <div>
          <h2>Document Browser</h2>
          <p>Browse collaborative documents and AST conflict queues</p>
        </div>
        <button type="button" onClick={onCreateDoc} className="new-doc-primary-btn">
          <Plus size={18} />
          <span>New AST Document</span>
        </button>
      </div>

      <div className="documents-cards-grid">
        {documents.map((doc) => {
          const hasConflict = doc.status === 'conflict';
          const blockCount = doc.ast?.children?.length || 0;

          return (
            <div
              key={doc.id}
              className={`doc-card-item ${hasConflict ? 'has-conflict' : ''}`}
              onClick={() => onSelectDoc(doc.id)}
            >
              <div className="card-top-bar">
                <span className="card-category-badge">
                  <Layers size={12} />
                  {doc.category}
                </span>

                {hasConflict ? (
                  <span className="card-status-badge conflict">
                    <AlertTriangle size={12} />
                    AST Conflict
                  </span>
                ) : (
                  <span className="card-status-badge synced">
                    <CheckCircle2 size={12} />
                    Synced
                  </span>
                )}
              </div>

              <h3 className="card-title">{doc.title}</h3>

              <div className="card-meta-info">
                <div className="author-flex">
                  <User size={13} />
                  <span>{doc.author}</span>
                </div>
                <span>•</span>
                <span>{blockCount} AST blocks</span>
              </div>

              <div className="card-tags-row">
                {doc.tags?.map((t, idx) => (
                  <span key={idx} className="card-tag">
                    <Tag size={10} />
                    {t}
                  </span>
                ))}
              </div>

              <div className="card-bottom-actions">
                <button
                  type="button"
                  className="card-open-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDoc(doc.id);
                  }}
                >
                  <span>Open Document</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  type="button"
                  className="card-delete-btn"
                  title="Delete Document"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDoc(doc.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
