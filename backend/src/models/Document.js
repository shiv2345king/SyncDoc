import mongoose from 'mongoose';
import { BlockNodeSchema } from './astBlockSchema.js';
import { traceDocumentAST } from '../hooks/astRelationshipTracer.js';

const { Schema } = mongoose;

/**
 * Collaborator subdocument schema
 */
export const CollaboratorSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
    email: { type: String },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' }
  },
  { _id: false }
);

/**
 * Root Document AST Schema
 * Contains top-level document properties and the recursive array of BlockNode children
 */
export const DocumentASTSchema = new Schema(
  {
    type: {
      type: String,
      default: 'doc',
      enum: ['doc']
    },
    version: {
      type: Number,
      default: 1,
      min: 1
    },
    // Array of recursive AST structural block nodes
    children: {
      type: [BlockNodeSchema],
      default: () => []
    }
  },
  { _id: false }
);

/**
 * Main SyncDoc Document Schema
 */
export const DocumentSchema = new Schema(
  {
    // Client-side / URL identifier (e.g. 'doc-1', 'doc-1718000')
    id: {
      type: String,
      required: true,
      index: true,
      trim: true
    },

    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      default: 'Untitled Document'
    },

    category: {
      type: String,
      default: 'General'
    },

    author: {
      type: String,
      required: [true, 'Document author is required'],
      default: 'Anonymous'
    },

    status: {
      type: String,
      enum: ['synced', 'syncing', 'conflict', 'draft'],
      default: 'draft'
    },

    tags: [{ type: String, trim: true }],

    collaborators: [CollaboratorSchema],

    // Hierarchical AST structure
    ast: {
      type: DocumentASTSchema,
      default: () => ({ type: 'doc', version: 1, children: [] })
    },

    // Tree metadata statistics (cached on save for fast querying)
    treeStats: {
      totalBlocks: { type: Number, default: 0 },
      maxDepth: { type: Number, default: 0 },
      lastTracedAt: { type: Date, default: Date.now }
    }
  },
  {
    timestamps: true // createdAt and updatedAt
  }
);

/**
 * Recursive Mongoose Pre-Save Hook
 * Traces all block relationships across the AST hierarchy before persisting.
 * Computes parentId, depth, path, pathArray, index, prevSiblingId, nextSiblingId,
 * childCount, descendantCount, and isLeaf for every node at any depth.
 */
DocumentSchema.pre('save', function (next) {
  try {
    if (this.ast && Array.isArray(this.ast.children)) {
      const stats = traceDocumentAST(this.ast);

      if (!this.treeStats) {
        this.treeStats = {};
      }
      this.treeStats.totalBlocks = stats.totalBlocks;
      this.treeStats.maxDepth = stats.maxDepth;
      this.treeStats.lastTracedAt = new Date();

      // Check if any block has an active conflict and update status accordingly if needed
      let hasConflict = false;
      for (const block of stats.blockMap.values()) {
        if (block.conflict && !block.conflict.resolved) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict && this.status === 'synced') {
        this.status = 'conflict';
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Helper instance method: Find a block by its id anywhere in the nested AST hierarchy
 */
DocumentSchema.methods.findBlockById = function (blockId) {
  if (!this.ast || !Array.isArray(this.ast.children)) return null;

  function search(nodes) {
    for (const node of nodes) {
      if (node.id === blockId) return node;
      if (Array.isArray(node.children) && node.children.length > 0) {
        const found = search(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  return search(this.ast.children);
};

/**
 * Helper instance method: Return flattened array of all blocks in preorder traversal
 */
DocumentSchema.methods.getFlattenedBlocks = function () {
  if (!this.ast || !Array.isArray(this.ast.children)) return [];

  const list = [];
  function traverse(nodes) {
    for (const node of nodes) {
      list.push(node);
      if (Array.isArray(node.children) && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(this.ast.children);
  return list;
};

/**
 * Helper instance method: Find direct children of a given block (or root if null)
 */
DocumentSchema.methods.getChildrenOf = function (parentId = null) {
  if (!parentId) {
    return this.ast?.children || [];
  }
  const parent = this.findBlockById(parentId);
  return parent ? parent.children || [] : [];
};

/**
 * Helper instance method: Find sibling blocks of a given block
 */
DocumentSchema.methods.getSiblingsOf = function (blockId) {
  const target = this.findBlockById(blockId);
  if (!target || !target.relationships) return [];

  const parentId = target.relationships.parentId;
  return this.getChildrenOf(parentId).filter(b => b.id !== blockId);
};

/**
 * Helper instance method: Trace relationships explicitly without triggering save
 */
DocumentSchema.methods.traceRelationships = function () {
  if (this.ast) {
    const stats = traceDocumentAST(this.ast);
    this.treeStats = {
      totalBlocks: stats.totalBlocks,
      maxDepth: stats.maxDepth,
      lastTracedAt: new Date()
    };
    return stats;
  }
  return null;
};

export const DocumentModel = mongoose.model('Document', DocumentSchema);
export default DocumentModel;
