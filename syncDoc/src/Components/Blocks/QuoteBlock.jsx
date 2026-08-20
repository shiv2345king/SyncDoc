import { Quote } from 'lucide-react';
import { FormattedText } from './FormattedText';

export function QuoteBlock({ block, onUpdateContent, isEditing }) {
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
        { text: e.target.value, format: { italic: true } }
      ]);
    }
  };

  return (
    <div className="ast-quote-block">
      <Quote size={24} className="quote-decorative-icon" />
      <div className="quote-content">
        {isEditing ? (
          <textarea
            className="block-quote-input"
            value={getText()}
            onChange={handleTextChange}
            rows={2}
          />
        ) : (
          <blockquote className="ast-blockquote">
            <FormattedText content={block.content} />
          </blockquote>
        )}
      </div>
    </div>
  );
}
