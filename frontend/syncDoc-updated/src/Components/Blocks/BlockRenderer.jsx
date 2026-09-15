import { BlockWrapper } from './BlockWrapper';
import { HeadingBlock } from './HeadingBlock';
import { ParagraphBlock } from './ParagraphBlock';
import { CodeBlock } from './CodeBlock';
import { CalloutBlock } from './CalloutBlock';
import { QuoteBlock } from './QuoteBlock';
import { ListBlock } from './ListBlock';
import { TableBlock } from './TableBlock';
import { DividerBlock } from './DividerBlock';

export function BlockRenderer({
  block,
  selectedBlockId,
  selectionBlockIds = null,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onMoveUp,
  onMoveDown,
  onInsertAfter,
  onOpenConflict,
  onOpenAstInspector,
  presencePeers = []
}) {
  const isSelected = selectedBlockId === block.id;

  const handleUpdateContent = (blockId, newContent) => {
    onUpdateBlock({
      ...block,
      content: newContent,
      version: (block.version || 1) + 1
    });
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'heading':
        return <HeadingBlock block={block} onUpdateContent={handleUpdateContent} />;
      case 'paragraph':
        return <ParagraphBlock block={block} onUpdateContent={handleUpdateContent} />;
      case 'code':
        return <CodeBlock block={block} onUpdateContent={handleUpdateContent} />;
      case 'callout':
        return <CalloutBlock block={block} onUpdateContent={handleUpdateContent} />;
      case 'quote':
        return <QuoteBlock block={block} onUpdateContent={handleUpdateContent} />;
      case 'list':
        return <ListBlock block={block} onUpdateBlock={onUpdateBlock} />;
      case 'table':
        return <TableBlock block={block} onUpdateBlock={onUpdateBlock} />;
      case 'divider':
        return <DividerBlock />;
      default:
        return (
          <div className="ast-unknown-block">
            Unknown AST Node type: <code>{block.type}</code>
          </div>
        );
    }
  };

  return (
    <BlockWrapper
      block={block}
      isSelected={isSelected}
      isInSelection={Boolean(selectionBlockIds?.includes(block.id))}
      onSelect={onSelectBlock}
      onDelete={onDeleteBlock}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onInsertAfter={onInsertAfter}
      onOpenConflict={onOpenConflict}
      onOpenAstInspector={onOpenAstInspector}
      onUpdateBlock={onUpdateBlock}
      presencePeers={presencePeers}
    >
      {renderBlockContent()}
    </BlockWrapper>
  );
}
