import { useState, cloneElement } from 'react';
import { useBlockState } from '../../context/BlockStateContext';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Code2,
  AlertTriangle,
  Plus,
  Edit3,
  Check,
  Layers
} from 'lucide-react';

export function BlockWrapper({
  block,
  isSelected,
  isInSelection = false,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  onInsertAfter,
  onOpenConflict,
  onOpenAstInspector,
  onUpdateBlock,
  presencePeers = [],
  children
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const { cursor } = useBlockState();
  const isCursorActive = cursor.blockId === block.id;

  // All peers whose cursor or selection range covers this block
  const activePeers = presencePeers.filter(p => p.cursorBlockId === block.id);
  const selectionPeers = presencePeers.filter(
    p => Array.isArray(p.selection?.blockIds) && p.selection.blockIds.includes(block.id)
  );
  const peerColorList = [...new Set([...activePeers, ...selectionPeers].map(p => p.color || '#6366f1'))];

  const isConflict = Boolean(block.conflict);

  const blockTypeLabels = {
    heading: `Heading (H${block.level || 1})`,
    paragraph: 'Paragraph',
    code: `Code (${block.language || 'code'})`,
    callout: `Callout (${block.variant || 'info'})`,
    quote: 'Quote',
    list: `List (${block.listType || 'bullet'})`,
    table: 'Table',
    divider: 'Divider'
  };

  const handleChangeType = (newType) => {
    setShowTypeMenu(false);
    if (!onUpdateBlock) return;

    let updated = { ...block, type: newType };
    if (newType === 'heading') updated.level = 2;
    if (newType === 'code') updated.language = 'javascript';
    if (newType === 'callout') updated.variant = 'info';
    if (newType === 'list') {
      updated.listType = 'bullet';
      updated.items = ['List item 1', 'List item 2'];
    }

    onUpdateBlock(updated);
  };

  return (
    <div
      className={`ast-block-wrapper ${isSelected ? 'is-selected' : ''} ${isInSelection ? 'is-in-selection' : ''} ${isCursorActive ? 'has-active-cursor' : ''} ${peerColorList.length > 0 ? 'has-peer-cursor' : ''} ${isConflict ? 'has-conflict' : ''}`}
      style={peerColorList.length > 0 ? { '--peer-cursor-colors': peerColorList.join(',') } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id, {
          shiftKey: e.shiftKey,
          offset: cursor.blockId === block.id ? cursor.offset : 0
        });
      }}
    >
      {/* Left Handle & Hover Controls */}
      <div className="block-side-controls">
        <button
          type="button"
          className="block-control-btn drag-handle"
          title="Drag block or click options"
          onClick={() => setShowTypeMenu(!showTypeMenu)}
        >
          <GripVertical size={16} />
        </button>

        <button
          type="button"
          className="block-control-btn add-btn"
          title="Insert block below"
          onClick={() => onInsertAfter(block.id)}
        >
          <Plus size={14} />
        </button>

        {showTypeMenu && (
          <div className="block-type-dropdown">
            <div className="dropdown-header">Transform Block</div>
            <button type="button" onClick={() => handleChangeType('paragraph')}>Paragraph</button>
            <button type="button" onClick={() => handleChangeType('heading')}>Heading</button>
            <button type="button" onClick={() => handleChangeType('code')}>Code Block</button>
            <button type="button" onClick={() => handleChangeType('callout')}>Callout Box</button>
            <button type="button" onClick={() => handleChangeType('quote')}>Block Quote</button>
            <button type="button" onClick={() => handleChangeType('list')}>List / Tasklist</button>
            <button type="button" onClick={() => handleChangeType('table')}>Table</button>
          </div>
        )}
      </div>

      {/* Main Block Content Area */}
      <div className="block-main-content">
        {/* Remote Peer Presence Cursor Indicators (one badge per peer) */}
        {activePeers.map(peer => (
          <div
            key={peer.id}
            className="peer-cursor-badge"
            style={{ backgroundColor: peer.color || '#6366f1' }}
          >
            <span className="cursor-dot" />
            <span>
              {peer.name} · offset {peer.cursorOffset ?? 0}
            </span>
          </div>
        ))}

        {/* Peers selecting within this block (no direct cursor) */}
        {selectionPeers
          .filter(p => !activePeers.includes(p))
          .map(peer => (
            <div
              key={peer.id}
              className="peer-selection-badge"
              style={{ '--peer-color': peer.color || '#6366f1' }}
            >
              <span className="cursor-dot" style={{ backgroundColor: peer.color || '#6366f1' }} />
              <span>{peer.name} selected {peer.selection.blockIds.length} block(s)</span>
            </div>
          ))}

        {/* Local Active Cursor Indicator (atomic cursor state) */}
        {isCursorActive && (
          <div className="local-cursor-badge">
            <span className="cursor-dot local" />
            <span>Active cursor · offset {cursor.offset}</span>
          </div>
        )}

        {/* Top Block Info Bar */}
        <div className="block-info-bar">
          <div className="block-type-badge">
            <Layers size={12} />
            <span>{blockTypeLabels[block.type] || block.type}</span>
            <span className="version-pill">v{block.version || 1}</span>
          </div>

          {isConflict && (
            <button
              type="button"
              className="conflict-alert-badge"
              onClick={(e) => {
                e.stopPropagation();
                onOpenConflict(block);
              }}
            >
              <AlertTriangle size={13} />
              <span>AST Conflict Detected</span>
              <span className="action-hint">Resolve →</span>
            </button>
          )}

          <div className="block-actions">
            <button
              type="button"
              className={`block-action-btn ${isEditing ? 'active' : ''}`}
              title={isEditing ? 'Save block edits' : 'Edit block'}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
            </button>

            <button
              type="button"
              className="block-action-btn"
              title="Inspect AST Node JSON"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAstInspector(block);
              }}
            >
              <Code2 size={14} />
            </button>

            <button
              type="button"
              className="block-action-btn"
              title="Move up"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp(block.id);
              }}
            >
              <ChevronUp size={14} />
            </button>

            <button
              type="button"
              className="block-action-btn"
              title="Move down"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown(block.id);
              }}
            >
              <ChevronDown size={14} />
            </button>

            <button
              type="button"
              className="block-action-btn danger"
              title="Delete block"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(block.id);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Render child component passing isEditing state */}
        <div className="block-body-render">
          {cloneElement(children, { isEditing })}
        </div>
      </div>
    </div>
  );
}
