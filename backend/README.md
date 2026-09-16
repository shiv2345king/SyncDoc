# SyncDoc Backend - AST Modeling Engine

SyncDoc backend service providing nested MongoDB schemas for document structural nodes (AST) and recursive Mongoose pre-save relationship tracing.

## Features

1. **Hierarchical AST Modeling**:
   - `BlockNodeSchema`: Recursive Mongoose schema for document nodes (`heading`, `paragraph`, `code`, `callout`, `quote`, `list`, `table`, `divider`, `container`).
   - Self-nesting via `children: [BlockNodeSchema]`.
   - Typed subdocuments for `TextSegmentSchema`, `TextFormatSchema`, `BlockMetadataSchema`, `ConflictSchema`, and `BlockRelationshipSchema`.

2. **Recursive Relationship Tracing**:
   - `traceBlockNode` & `traceDocumentAST`: Pre-save hook computes tree topology dynamically:
     - `parentId`: Direct parent block ID (or `null` for root-level blocks)
     - `depth`: Tree depth (0 for root blocks, 1+ for nested children)
     - `path`: Materialized path string (e.g. `/root/parent-1/child-1`)
     - `pathArray`: Array of ancestor block IDs
     - `index`: Sibling position index within parent's children
     - `prevSiblingId` & `nextSiblingId`: Doubly-linked sibling pointers
     - `childCount`: Direct child count
     - `descendantCount`: Recursive total descendants under node
     - `isLeaf`: Boolean indicator (`childCount === 0`)
   - Cycle detection (`ASTCycleError`) and duplicate ID detection (`ASTDuplicateIdError`).

3. **Mongoose Document Model**:
   - `DocumentModel` wrapping `DocumentSchema` with `DocumentASTSchema`.
   - Pre-save hook automatically updates `treeStats` (`totalBlocks`, `maxDepth`, `lastTracedAt`) and status conflicts.
   - Instance methods: `findBlockById(id)`, `getFlattenedBlocks()`, `getChildrenOf(parentId)`, `getSiblingsOf(blockId)`, and `traceRelationships()`.

## Running Tests

```bash
cd backend
npm test
```
