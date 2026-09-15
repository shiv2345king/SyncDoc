import {
  X,
  Heading1,
  AlignLeft,
  Code,
  AlertTriangle,
  Quote,
  List,
  Table,
  Minus,
  Plus
} from 'lucide-react';

export function NewBlockModal({ onClose, onAddBlock }) {
  const blockOptions = [
    {
      type: 'paragraph',
      title: 'Paragraph',
      desc: 'Standard text block with inline formatting',
      icon: <AlignLeft size={20} />
    },
    {
      type: 'heading',
      title: 'Heading',
      desc: 'H1, H2, H3 section title',
      icon: <Heading1 size={20} />
    },
    {
      type: 'code',
      title: 'Code Block',
      desc: 'Syntax highlighted code snippet',
      icon: <Code size={20} />
    },
    {
      type: 'callout',
      title: 'Callout Box',
      desc: 'Highlighted note, alert, info, or warning box',
      icon: <AlertTriangle size={20} />
    },
    {
      type: 'quote',
      title: 'Quote',
      desc: 'Blockquote for citations or highlights',
      icon: <Quote size={20} />
    },
    {
      type: 'list',
      title: 'List / Checklist',
      desc: 'Bulleted, numbered, or interactive tasklist',
      icon: <List size={20} />
    },
    {
      type: 'table',
      title: 'Table',
      desc: 'Structured tabular data grid',
      icon: <Table size={20} />
    },
    {
      type: 'divider',
      title: 'Divider',
      desc: 'Horizontal rule section separator',
      icon: <Minus size={20} />
    }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="new-block-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Insert AST Block Node</h2>
            <p>Select a block type to add to document syntax tree</p>
          </div>
          <button type="button" onClick={onClose} className="close-modal-btn">
            <X size={20} />
          </button>
        </div>

        <div className="block-options-grid">
          {blockOptions.map((opt) => (
            <button
              key={opt.type}
              type="button"
              className="block-option-item"
              onClick={() => {
                onAddBlock(opt.type);
                onClose();
              }}
            >
              <div className="option-icon-box">{opt.icon}</div>
              <div className="option-text-box">
                <div className="option-title">{opt.title}</div>
                <div className="option-desc">{opt.desc}</div>
              </div>
              <Plus size={16} className="add-plus-icon" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
