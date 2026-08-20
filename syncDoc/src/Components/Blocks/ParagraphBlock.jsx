import { FormattedText } from './FormattedText';

export function ParagraphBlock({ block, onUpdateContent, isEditing }) {
  const getParagraphText = () => {
    if (typeof block.content === 'string') return block.content;
    if (Array.isArray(block.content)) {
      return block.content.map(s => (typeof s === 'string' ? s : s.text)).join('');
    }
    return '';
  };

  const handleInputChange = (e) => {
    const newText = e.target.value;
    if (onUpdateContent) {
      onUpdateContent(block.id, [
        { text: newText, format: block.content?.[0]?.format || {} }
      ]);
    }
  };

  return (
    <div className="ast-paragraph-block">
      {isEditing ? (
        <textarea
          className="block-paragraph-input"
          value={getParagraphText()}
          onChange={handleInputChange}
          placeholder="Type paragraph content..."
          rows={Math.max(2, Math.ceil(getParagraphText().length / 60))}
        />
      ) : (
        <p className="ast-paragraph">
          <FormattedText content={block.content} />
        </p>
      )}
    </div>
  );
}
