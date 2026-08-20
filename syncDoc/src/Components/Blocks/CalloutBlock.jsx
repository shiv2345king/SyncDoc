import { Info, AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react';
import { FormattedText } from './FormattedText';

export function CalloutBlock({ block, onUpdateContent, isEditing }) {
  const variant = block.variant || 'info';

  const getIcon = () => {
    switch (variant) {
      case 'warning':
        return <AlertTriangle size={20} className="callout-icon warning" />;
      case 'success':
        return <CheckCircle2 size={20} className="callout-icon success" />;
      case 'danger':
        return <AlertOctagon size={20} className="callout-icon danger" />;
      case 'info':
      default:
        return <Info size={20} className="callout-icon info" />;
    }
  };

  const getText = () => {
    if (typeof block.content === 'string') return block.content;
    if (Array.isArray(block.content)) {
      return block.content.map(s => (typeof s === 'string' ? s : s.text)).join('');
    }
    return '';
  };

  const handleTextChange = (e) => {
    if (onUpdateContent) {
      onUpdateContent(block.id, [
        { text: e.target.value, format: {} }
      ]);
    }
  };

  return (
    <div className={`ast-callout-block variant-${variant}`}>
      <div className="callout-icon-container">
        {getIcon()}
      </div>
      <div className="callout-content-container">
        {isEditing ? (
          <textarea
            className="block-callout-input"
            value={getText()}
            onChange={handleTextChange}
            rows={2}
          />
        ) : (
          <div className="callout-text">
            <FormattedText content={block.content} />
          </div>
        )}
      </div>
    </div>
  );
}
