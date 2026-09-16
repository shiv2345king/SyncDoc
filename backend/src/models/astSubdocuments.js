import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Text formatting marks subdocument schema
 * Supports inline formatting styles applied to text spans
 */
export const TextFormatSchema = new Schema(
  {
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
    strike: { type: Boolean, default: false },
    code: { type: Boolean, default: false },
    link: { type: String, default: null },
    color: { type: String, default: null },
    highlight: { type: String, default: null }
  },
  { _id: false }
);

/**
 * Inline text segment subdocument schema
 * Rich-text spans within AST block content
 */
export const TextSegmentSchema = new Schema(
  {
    text: { type: String, default: '' },
    format: { type: TextFormatSchema, default: () => ({}) }
  },
  { _id: false }
);

/**
 * Metadata subdocument schema for tracking creation/modifications
 */
export const BlockMetadataSchema = new Schema(
  {
    createdBy: { type: String, default: 'anonymous' },
    lastModifiedBy: { type: String, default: 'anonymous' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    attributes: { type: Map, of: Schema.Types.Mixed, default: () => new Map() }
  },
  { _id: false }
);

/**
 * AST Conflict subdocument schema for concurrent branch edits & 3-way merges
 */
export const ConflictSchema = new Schema(
  {
    id: { type: String, required: true },
    authorLocal: { type: String, default: '' },
    authorRemote: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['content_mismatch', 'structural_split', 'ordering_conflict', 'concurrent_delete', 'version_divergence'],
      default: 'content_mismatch'
    },
    localNode: { type: Schema.Types.Mixed },
    remoteNode: { type: Schema.Types.Mixed },
    baseNode: { type: Schema.Types.Mixed },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: String }
  },
  { _id: false }
);

/**
 * Block Relationship Trace subdocument schema
 * Traces the hierarchical and sibling relationships of each AST node in the document tree.
 * Computed and maintained by the recursive Mongoose pre-save hook.
 */
export const BlockRelationshipSchema = new Schema(
  {
    parentId: { type: String, default: null }, // blockId of direct parent, or null if root-level block
    depth: { type: Number, default: 0, min: 0 }, // 0 = direct child of doc root, 1 = nested child, etc.
    path: { type: String, default: '' }, // Materialized path (e.g. "/root/blk-101/blk-102")
    pathArray: [{ type: String }], // Array of ancestor blockIds ['blk-101', ...]
    index: { type: Number, default: 0 }, // Sibling position index within current parent
    prevSiblingId: { type: String, default: null }, // blockId of the previous sibling, or null
    nextSiblingId: { type: String, default: null }, // blockId of the next sibling, or null
    childCount: { type: Number, default: 0 }, // Direct children count
    descendantCount: { type: Number, default: 0 }, // Total recursive descendants under this node
    isLeaf: { type: Boolean, default: true } // True if block has 0 children
  },
  { _id: false }
);
