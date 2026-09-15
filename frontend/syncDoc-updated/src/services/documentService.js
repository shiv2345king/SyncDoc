import { apiClient } from './apiClient';

/**
 * The backend's Document schema only stores { title, ownerId, collaborators,
 * rootNodeId, createdAt, updatedAt }. The UI wants category/author/status/tags
 * for the sidebar + grid views, none of which exist on the backend yet, so we
 * fill in sane defaults here instead of letting the UI crash on `undefined`.
 */
function normalizeDocument(doc, authorName) {
  return {
    id: doc._id,
    title: doc.title,
    category: 'General',
    author: authorName || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    status: 'synced',
    tags: [],
    collaborators: [],
    // Blocks are fetched separately (getWithBlocks) and merged in once a
    // document is actually opened — an empty tree is a safe placeholder.
    ast: { type: 'doc', version: 1, children: [] }
  };
}

export const documentService = {
  async list(authorName) {
    const docs = await apiClient.get('/api/documents');
    return docs.map((d) => normalizeDocument(d, authorName));
  },

  async create(title, authorName) {
    const doc = await apiClient.post('/api/documents', { title });
    return normalizeDocument(doc, authorName);
  },

  /** Returns { document, blocks } — blocks are still in raw backend shape. */
  getWithBlocks(id) {
    return apiClient.get(`/api/documents/${id}`);
  }
};

export { normalizeDocument };
