import mongoose from 'mongoose';
import {
  TextSegmentSchema,
  BlockMetadataSchema,
  ConflictSchema,
  BlockRelationshipSchema
} from './astSubdocuments.js';

const { Schema } = mongoose;

/**
 * Supported AST Block Node Types
 */
export const AST_NODE_TYPES = [
  'heading',
  'paragraph',
  'code',
  'callout',
  'quote',
  'list',
  'table',
  'divider',
  'container'
];

/**
 * Recursive AST Block Node Schema
 * Represents a single structural node in the document's Abstract Syntax Tree.
 * Supports recursive self-nesting via `children: [BlockNodeSchema]`.
 */
export const BlockNodeSchema = new Schema(
  {
    // Unique identifier for the block (e.g., 'blk-101', UUID, or custom ID)
    id: {
      type: String,
      required: [true, 'Block id is required'],
      trim: true
    },

    // Semantic node type
    type: {
      type: String,
      required: [true, 'Block type is required'],
      enum: {
        values: AST_NODE_TYPES,
        message: 'Invalid AST block type: {VALUE}'
      }
    },

    // Monotonically increasing revision number for the block
    version: {
      type: Number,
      default: 1,
      min: 1
    },

    // Vector clock for distributed multi-user CRDT synchronization
    versionVector: {
      type: Map,
      of: Number,
      default: () => new Map()
    },

    // Rich-text inline content segments OR plain string (for code/raw blocks)
    content: {
      type: Schema.Types.Mixed,
      default: () => []
    },

    // --- Type-specific attributes ---
    // For 'heading': level 1..6
    level: {
      type: Number,
      min: 1,
      max: 6,
      validate: {
        validator: function (v) {
          if (this.type === 'heading') return v != null && v >= 1 && v <= 6;
          return true;
        },
        message: 'Headings must specify a valid level between 1 and 6'
      }
    },

    // For 'callout': info | success | warning | danger | note
    variant: {
      type: String,
      enum: ['info', 'success', 'warning', 'danger', 'note']
    },

    // For 'code': programming language
    language: {
      type: String,
      default: 'javascript'
    },

    // For 'list': listType ('bullet' | 'numbered' | 'task'), items array, checked boolean array
    listType: {
      type: String,
      enum: ['bullet', 'numbered', 'task']
    },
    items: [{ type: String }],
    checked: [{ type: Boolean }],

    // For 'table': columns header array and 2D rows matrix
    columns: [{ type: String }],
    rows: [[{ type: String }]],

    // Structural or content conflict metadata
    conflict: {
      type: ConflictSchema,
      default: null
    },

    // Audit and editing metadata
    metadata: {
      type: BlockMetadataSchema,
      default: () => ({})
    },

    // Relationship tracing metadata calculated via recursive Mongoose pre-save hooks
    relationships: {
      type: BlockRelationshipSchema,
      default: () => ({})
    }
  },
  {
    _id: false, // Prevents auto-generating _id for subdocuments, keeping clean AST semantics
    timestamps: false
  }
);

// Enable recursive nesting: BlockNode can have an array of child BlockNodes
BlockNodeSchema.add({
  children: [BlockNodeSchema]
});
