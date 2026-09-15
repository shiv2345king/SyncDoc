/**
 * The backend's BlockNode only has a plain-string `content` field (plus
 * type/order/parentId). The editor's blocks are much richer — headings carry
 * a level, lists carry items, tables carry columns/rows, etc. Rather than
 * changing the backend schema, we serialize everything the UI needs (minus
 * id/type/order, which the backend already tracks natively) as JSON inside
 * that string field, and parse it back out on the way in.
 */

/** Frontend AST block -> payload for POST /api/blocks or PATCH /api/blocks/:id */
export function toBackendBlockPayload(block, documentId, order) {
  const { id, type, order: _order, ...rest } = block;
  return {
    documentId,
    type,
    order,
    content: JSON.stringify(rest)
  };
}

/** Backend BlockNode document -> the shape BlockRenderer/ASTTreeVisualizer expect */
export function toFrontendBlock(backendBlock) {
  let rest = {};
  if (backendBlock.content) {
    try {
      rest = JSON.parse(backendBlock.content);
    } catch {
      // Content isn't JSON (e.g. was written some other way) — treat it as
      // plain text so the block still renders instead of throwing.
      rest = { content: [{ text: backendBlock.content }] };
    }
  }
  return {
    id: backendBlock._id,
    type: backendBlock.type,
    order: backendBlock.order,
    ...rest
  };
}
