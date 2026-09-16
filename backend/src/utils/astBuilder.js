import { DocumentModel } from '../models/Document.js';

/**
 * Validates and normalizes raw JSON data into a Document instance
 */
export function buildDocumentFromAST(rawDoc) {
  const doc = new DocumentModel({
    id: rawDoc.id,
    title: rawDoc.title || 'Untitled Document',
    category: rawDoc.category || 'General',
    author: rawDoc.author || 'Anonymous',
    status: rawDoc.status || 'draft',
    tags: rawDoc.tags || [],
    collaborators: rawDoc.collaborators || [],
    ast: {
      type: rawDoc.ast?.type || 'doc',
      version: rawDoc.ast?.version || 1,
      children: rawDoc.ast?.children || []
    }
  });

  return doc;
}

/**
 * Helper to construct a new AST block node object
 */
export function createASTNode({
  id,
  type = 'paragraph',
  content = [],
  children = [],
  version = 1,
  metadata = {},
  ...extra
}) {
  return {
    id,
    type,
    content,
    children,
    version,
    metadata: {
      createdBy: metadata.createdBy || 'anonymous',
      lastModifiedBy: metadata.lastModifiedBy || 'anonymous',
      createdAt: metadata.createdAt || new Date(),
      ...metadata
    },
    ...extra
  };
}
