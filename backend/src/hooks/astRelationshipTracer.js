/**
 * AST Relationship Tracer for SyncDoc Nested Schemas
 */

export class ASTCycleError extends Error {
  constructor(message, cycleIds = []) {
    super(message);
    this.name = 'ASTCycleError';
    this.cycleIds = cycleIds;
  }
}

export class ASTDuplicateIdError extends Error {
  constructor(message, duplicateId) {
    super(message);
    this.name = 'ASTDuplicateIdError';
    this.duplicateId = duplicateId;
  }
}

/**
 * Recursively traces relationships on an AST block node and all its descendants.
 * Mutates block.relationships in place.
 *
 * @param {Object} block - Current AST block node
 * @param {Object} context - Traversal context
 * @param {string|null} context.parentId - Immediate parent blockId or null
 * @param {number} context.depth - Current tree depth
 * @param {string} context.path - Materialized path string
 * @param {string[]} context.pathArray - Array of ancestor block IDs
 * @param {number} context.index - Sibling index
 * @param {string|null} context.prevSiblingId - Previous sibling blockId
 * @param {string|null} context.nextSiblingId - Next sibling blockId
 * @param {Set<string>} context.seenBlockIds - Set of all seen block IDs in the document
 * @param {string[]} context.ancestorChain - Current chain of ancestors for cycle detection
 * @returns {number} Total number of descendants under this block
 */
export function traceBlockNode(block, context = {}) {
  const {
    parentId = null,
    depth = 0,
    path = '/root',
    pathArray = [],
    index = 0,
    prevSiblingId = null,
    nextSiblingId = null,
    seenBlockIds = new Set(),
    ancestorChain = []
  } = context;

  if (!block || typeof block !== 'object') {
    return 0;
  }

  const blockId = block.id;

  if (!blockId) {
    throw new Error('AST block node is missing required "id" property during relationship tracing.');
  }

  // 1. Cycle detection: check if blockId already exists in current ancestor chain
  if (ancestorChain.includes(blockId)) {
    const cycle = [...ancestorChain, blockId].join(' -> ');
    throw new ASTCycleError(
      `Cyclic relationship detected in document AST: ${cycle}`,
      [...ancestorChain, blockId]
    );
  }

  // 2. Duplicate ID detection: ensure block ID is globally unique in this AST
  if (seenBlockIds.has(blockId)) {
    throw new ASTDuplicateIdError(
      `Duplicate block ID "${blockId}" found in document AST. Block IDs must be unique.`,
      blockId
    );
  }
  seenBlockIds.add(blockId);

  // Compute materialized path and ancestor chain for descendants
  const currentPath = `${path}/${blockId}`;
  const currentPathArray = [...pathArray];
  const nextAncestorChain = [...ancestorChain, blockId];
  const nextPathArray = [...pathArray, blockId];

  const children = Array.isArray(block.children) ? block.children : [];
  const childCount = children.length;
  let totalDescendants = 0;

  // 3. Recursively process children
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const prevChildId = i > 0 ? children[i - 1]?.id || null : null;
    const nextChildId = i < children.length - 1 ? children[i + 1]?.id || null : null;

    const childDescendants = traceBlockNode(child, {
      parentId: blockId,
      depth: depth + 1,
      path: currentPath,
      pathArray: nextPathArray,
      index: i,
      prevSiblingId: prevChildId,
      nextSiblingId: nextChildId,
      seenBlockIds,
      ancestorChain: nextAncestorChain
    });

    totalDescendants += 1 + childDescendants;
  }

  // 4. Assign calculated relationships object
  block.relationships = {
    parentId,
    depth,
    path: currentPath,
    pathArray: currentPathArray,
    index,
    prevSiblingId,
    nextSiblingId,
    childCount,
    descendantCount: totalDescendants,
    isLeaf: childCount === 0
  };

  return totalDescendants;
}

/**
 * Traces all block relationships across the document's root AST children.
 *
 * @param {Object} ast - Document ast object ({ type: 'doc', version, children })
 * @returns {{ totalBlocks: number, maxDepth: number, blockMap: Map<string, Object> }}
 */
export function traceDocumentAST(ast) {
  if (!ast || typeof ast !== 'object') {
    return { totalBlocks: 0, maxDepth: 0, blockMap: new Map() };
  }

  const children = Array.isArray(ast.children) ? ast.children : [];
  const seenBlockIds = new Set();
  const blockMap = new Map();
  let maxDepth = 0;
  let totalBlocks = 0;

  for (let i = 0; i < children.length; i++) {
    const block = children[i];
    const prevSiblingId = i > 0 ? children[i - 1]?.id || null : null;
    const nextSiblingId = i < children.length - 1 ? children[i + 1]?.id || null : null;

    const descendants = traceBlockNode(block, {
      parentId: null,
      depth: 0,
      path: '/root',
      pathArray: [],
      index: i,
      prevSiblingId,
      nextSiblingId,
      seenBlockIds,
      ancestorChain: []
    });

    totalBlocks += 1 + descendants;
  }

  // Helper visitor to calculate max depth and populate block lookup map
  function collectNodes(nodes) {
    for (const node of nodes) {
      if (node && node.id) {
        blockMap.set(node.id, node);
        if (node.relationships?.depth > maxDepth) {
          maxDepth = node.relationships.depth;
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          collectNodes(node.children);
        }
      }
    }
  }

  collectNodes(children);

  return {
    totalBlocks,
    maxDepth,
    blockMap
  };
}
