import { useState } from 'react';
import { Copy, Check, Code as CodeIcon } from 'lucide-react';

export function CodeBlock({ block, onUpdateContent, isEditing }) {
  const [copied, setCopied] = useState(false);
  const codeContent = typeof block.content === 'string'
    ? block.content
    : (Array.isArray(block.content) ? block.content.map(s => typeof s === 'string' ? s : s.text).join('') : '');

  const language = block.language || 'javascript';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTextChange = (e) => {
    if (onUpdateContent) {
      onUpdateContent(block.id, e.target.value);
    }
  };

  const lines = codeContent.split('\n');

  return (
    <div className="ast-code-block">
      <div className="code-block-header">
        <div className="code-lang-tag">
          <CodeIcon size={14} className="code-header-icon" />
          <span>{language}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="code-copy-btn"
          title="Copy code"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      <div className="code-block-body">
        {isEditing ? (
          <textarea
            className="block-code-input"
            value={codeContent}
            onChange={handleTextChange}
            rows={Math.max(3, lines.length)}
            spellCheck={false}
          />
        ) : (
          <div className="code-lines-container">
            <div className="code-line-numbers">
              {lines.map((_, i) => (
                <span key={i} className="line-number">{i + 1}</span>
              ))}
            </div>
              <pre className="code-text-pre">
                <code>{codeContent}</code>
              </pre>
          </div>
        )}
      </div>
    </div>
  );
}
