import { useState } from 'react';
import {
  FolderTree,
  ChevronDown,
  ChevronRight,
  Code,
  AlertTriangle,
  Copy,
  Check,
  Hash
} from 'lucide-react';

export function ASTTreeVisualizer({
  document,
  selectedBlockId,
  selectionBlockIds = null,
  onSelectBlock,
  onOpenConflictModal,
  onOpenAstInspector
}) {
  const [copied, setCopied] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({
    root: true,
    children: true
  });

  if (!document) return null;

  const ast = document.ast;
  const blocks = ast?.children || [];

  const toggleExpand = (nodeKey) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };

  const handleCopyFullAst = () => {
    navigator.clipboard.writeText(JSON.stringify(ast, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNodePreviewText = (block) => {
    if (typeof block.content === 'string') return block.content.slice(0, 40);
    if (Array.isArray(block.content)) {
      return block.content.map(s => typeof s === 'string' ? s : s.text).join('').slice(0, 40);
    }
    if (block.items) return `${block.items.length} list items`;
    if (block.columns) return `${block.columns.length} columns x ${block.rows?.length || 0} rows`;
    return '';
  };

  return (
    <div className="ast-tree-panel">
      <div className="ast-tree-header">
        <div className="ast-tree-title">
          <FolderTree size={18} className="ast-icon" />
          <span>Document AST Tree</span>
          <span className="ast-version-tag">doc.version = {ast.version || 1}</span>
        </div>

        <button
          type="button"
          onClick={handleCopyFullAst}
          className="copy-ast-json-btn"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy AST JSON'}</span>
        </button>
      </div>

      <div className="ast-tree-body">
        {/* Document Root Node */}
        <div className="ast-node-item root-node">
          <div
            className="ast-node-row"
            onClick={() => toggleExpand('root')}
          >
            {expandedNodes.root ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="node-type-label root">doc</span>
            <span className="node-id-tag">root</span>
            <span className="node-child-count">{blocks.length} child blocks</span>
          </div>

          {expandedNodes.root && (
            <div className="ast-node-children">
              {blocks.map((block, idx) => {
                const isSelected = block.id === selectedBlockId;
                const isInSelection = Boolean(selectionBlockIds?.includes(block.id));
                const hasConflict = Boolean(block.conflict);
                const isExpanded = expandedNodes[block.id];
                const previewText = getNodePreviewText(block);

                return (
                  <div
                    key={block.id || idx}
                    className={`ast-node-item child-block ${isSelected ? 'is-selected' : ''} ${isInSelection ? 'is-in-selection' : ''} ${hasConflict ? 'has-conflict' : ''}`}
                  >
                    <div
                      className="ast-node-row"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBlock(block.id, { shiftKey: e.shiftKey });
                        toggleExpand(block.id);
                      }}
                    >
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}

                      <span className={`node-type-badge type-${block.type}`}>
                        {block.type}
                      </span>

                      <span className="node-id-hash">
                        <Hash size={11} />
                        {block.id}
                      </span>

                      <span className="node-v-tag">v{block.version || 1}</span>

                      {previewText && (
                        <span className="node-text-preview">"{previewText}..."</span>
                      )}

                      {hasConflict && (
                        <button
                          type="button"
                          className="ast-conflict-mini-tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenConflictModal(block);
                          }}
                        >
                          <AlertTriangle size={12} />
                          <span>Conflict</span>
                        </button>
                      )}
                    </div>

                    {/* Detailed AST Node Properties Expansion */}
                    {isExpanded && (
                      <div className="ast-node-details">
                        <div className="detail-line">
                          <span className="key">id:</span> <span className="val-str">"{block.id}"</span>
                        </div>
                        <div className="detail-line">
                          <span className="key">type:</span> <span className="val-str">"{block.type}"</span>
                        </div>
                        {block.level && (
                          <div className="detail-line">
                            <span className="key">level:</span> <span className="val-num">{block.level}</span>
                          </div>
                        )}
                        {block.language && (
                          <div className="detail-line">
                            <span className="key">language:</span> <span className="val-str">"{block.language}"</span>
                          </div>
                        )}
                        <div className="detail-line">
                          <span className="key">version:</span> <span className="val-num">{block.version || 1}</span>
                        </div>

                        <div className="inspector-shortcut">
                          <button
                            type="button"
                            onClick={() => onOpenAstInspector(block)}
                            className="inspect-node-btn"
                          >
                            <Code size={12} />
                            <span>View Full Node Schema</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
