import { useState } from 'react';
import { Code, X, Copy, Check, Hash, Layers } from 'lucide-react';

export function ASTInspectorModal({ block, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!block) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(block, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="ast-inspector-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-flex">
            <div className="inspector-icon-ring">
              <Code size={20} />
            </div>
            <div>
              <h2>AST Node Schema Inspector</h2>
              <p>
                <Layers size={13} className="inline-icon" /> {block.type} •
                <Hash size={13} className="inline-icon" /> {block.id}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="close-modal-btn">
            <X size={20} />
          </button>
        </div>

        <div className="inspector-code-box">
          <div className="code-box-top">
            <span>JSON AST Node Definition</span>
            <button type="button" onClick={handleCopy} className="copy-json-btn">
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
          <pre className="inspector-json-pre">
            <code>{JSON.stringify(block, null, 2)}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
