import { apiClient } from './apiClient';
import { toBackendBlockPayload, toFrontendBlock } from '../models/blockTransform';

export const blockService = {
  async create(block, documentId, order) {
    const payload = toBackendBlockPayload(block, documentId, order);
    const created = await apiClient.post('/api/blocks', payload);
    return toFrontendBlock(created);
  },

  /** Persists everything except id/type/order onto the block's content field. */
  async update(block) {
    const { id, type, order, ...rest } = block;
    const updated = await apiClient.patch(`/api/blocks/${id}`, {
      content: JSON.stringify(rest)
    });
    return toFrontendBlock(updated);
  },

  remove(blockId) {
    return apiClient.delete(`/api/blocks/${blockId}`);
  }
};
