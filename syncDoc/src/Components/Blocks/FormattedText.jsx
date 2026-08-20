import { Fragment } from 'react';

/**
 * FormattedText: Renders inline text segments from AST node content array
 * handles bold, italic, code, underline, and link formatting
 */
export function FormattedText({ content }) {
  if (!content) return null;

  // Handle plain string content fallback
  if (typeof content === 'string') {
    return <span>{content}</span>;
  }

  if (!Array.isArray(content)) {
    return <span>{String(content)}</span>;
  }

  return (
    <>
      {content.map((segment, idx) => {
        const { text, format = {} } = segment;
        let el = <>{text}</>;

        if (format.code) {
          el = <code className="inline-ast-code">{el}</code>;
        }
        if (format.bold) {
          el = <strong>{el}</strong>;
        }
        if (format.italic) {
          el = <em>{el}</em>;
        }
        if (format.underline) {
          el = <u>{el}</u>;
        }
        if (format.href) {
          el = (
            <a href={format.href} target="_blank" rel="noopener noreferrer" className="ast-link">
              {el}
            </a>
          );
        }

        return <Fragment key={idx}>{el}</Fragment>;
      })}
    </>
  );
}
