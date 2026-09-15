import { FormattedText } from './FormattedText';

export function HeadingBlock({ block, onUpdateContent, isEditing }) {
  const level = block.level || 1;

  const getHeadingText = () => {
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

  const textContent = getHeadingText();

  const renderHeading = () => {
    const children = isEditing ? (
      <input
        type="text"
        className="block-heading-input"
        value={textContent}
        onChange={handleInputChange}
        placeholder={`Heading ${level}...`}
      />
    ) : (
      <FormattedText content={block.content} />
    );

    switch (level) {
      case 1:
        return <h1 className="ast-heading ast-h1">{children}</h1>;
      case 2:
        return <h2 className="ast-heading ast-h2">{children}</h2>;
      case 3:
        return <h3 className="ast-heading ast-h3">{children}</h3>;
      case 4:
      default:
        return <h4 className="ast-heading ast-h4">{children}</h4>;
    }
  };

  return (
    <div className={`block-heading-wrapper level-${level}`}>
      {renderHeading()}
    </div>
  );
}
