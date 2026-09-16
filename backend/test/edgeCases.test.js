import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DocumentModel,
  traceDocumentAST
} from '../src/models/index.js';
import { buildDocumentFromAST, createASTNode } from '../src/utils/astBuilder.js';

describe('AST Relationship Tracing - Edge Cases & Complex Scenarios', () => {
  test('handles deep 6-level nested trees and correctly traces ancestor paths & depths', () => {
    // Construct 6-level chain: l0 -> l1 -> l2 -> l3 -> l4 -> l5
    const leaf = createASTNode({ id: 'leaf-node', type: 'code', language: 'python' });
    const l4 = createASTNode({ id: 'level-4', type: 'container', children: [leaf] });
    const l3 = createASTNode({ id: 'level-3', type: 'container', children: [l4] });
    const l2 = createASTNode({ id: 'level-2', type: 'container', children: [l3] });
    const l1 = createASTNode({ id: 'level-1', type: 'container', children: [l2] });
    const l0 = createASTNode({ id: 'level-0', type: 'container', children: [l1] });

    const ast = {
      type: 'doc',
      version: 1,
      children: [l0]
    };

    const stats = traceDocumentAST(ast);

    assert.equal(stats.totalBlocks, 6);
    assert.equal(stats.maxDepth, 5);

    assert.equal(l0.relationships.depth, 0);
    assert.equal(l0.relationships.parentId, null);
    assert.equal(l0.relationships.childCount, 1);
    assert.equal(l0.relationships.descendantCount, 5);

    assert.equal(leaf.relationships.depth, 5);
    assert.equal(leaf.relationships.parentId, 'level-4');
    assert.equal(leaf.relationships.path, '/root/level-0/level-1/level-2/level-3/level-4/leaf-node');
    assert.deepEqual(leaf.relationships.pathArray, ['level-0', 'level-1', 'level-2', 'level-3', 'level-4']);
    assert.equal(leaf.relationships.childCount, 0);
    assert.equal(leaf.relationships.descendantCount, 0);
    assert.equal(leaf.relationships.isLeaf, true);
  });

  test('re-traces relationships dynamically when blocks are reordered or reparented', () => {
    // Initial: [A, B]
    const nodeA = createASTNode({ id: 'blk-A', type: 'paragraph' });
    const nodeB = createASTNode({ id: 'blk-B', type: 'paragraph' });

    const ast = {
      type: 'doc',
      version: 1,
      children: [nodeA, nodeB]
    };

    traceDocumentAST(ast);
    assert.equal(nodeA.relationships.index, 0);
    assert.equal(nodeA.relationships.nextSiblingId, 'blk-B');
    assert.equal(nodeB.relationships.index, 1);
    assert.equal(nodeB.relationships.prevSiblingId, 'blk-A');

    // Reorder: [B, A]
    ast.children = [nodeB, nodeA];
    traceDocumentAST(ast);

    assert.equal(nodeB.relationships.index, 0);
    assert.equal(nodeB.relationships.prevSiblingId, null);
    assert.equal(nodeB.relationships.nextSiblingId, 'blk-A');

    assert.equal(nodeA.relationships.index, 1);
    assert.equal(nodeA.relationships.prevSiblingId, 'blk-B');
    assert.equal(nodeA.relationships.nextSiblingId, null);

    // Reparent: A becomes child of B
    nodeB.children = [nodeA];
    ast.children = [nodeB];
    traceDocumentAST(ast);

    assert.equal(nodeB.relationships.childCount, 1);
    assert.equal(nodeB.relationships.descendantCount, 1);
    assert.equal(nodeA.relationships.parentId, 'blk-B');
    assert.equal(nodeA.relationships.depth, 1);
    assert.equal(nodeA.relationships.path, '/root/blk-B/blk-A');
  });

  test('converts sampleData documents and properly traces their entire AST', () => {
    // Sample doc simulation matching INITIAL_DOCUMENTS from frontend
    const sampleDocData = {
      id: 'doc-sample-1',
      title: 'SyncDoc Architecture & AST Conflict Resolution Spec',
      category: 'Engineering Specs',
      author: 'Alex Rivers',
      status: 'conflict',
      tags: ['AST', 'CRDT', 'Architecture', 'v2.0'],
      collaborators: [
        { id: 'u1', name: 'Alex Rivers', color: '#6366f1' },
        { id: 'u2', name: 'Elena Rostova', color: '#ec4899' }
      ],
      ast: {
        type: 'doc',
        version: 14,
        children: [
          {
            id: 'blk-101',
            type: 'heading',
            level: 1,
            content: [{ text: 'SyncDoc Engine', format: { bold: true } }]
          },
          {
            id: 'blk-102',
            type: 'callout',
            variant: 'info',
            content: [{ text: 'Notice text' }]
          },
          {
            id: 'blk-105',
            type: 'code',
            language: 'typescript',
            content: 'interface ASTBlock { id: string }',
            conflict: {
              id: 'cnf-901',
              authorLocal: 'Alex',
              authorRemote: 'Elena',
              type: 'content_mismatch',
              resolved: false
            }
          },
          {
            id: 'blk-109',
            type: 'table',
            columns: ['AST Node', 'CRDT Algorithm'],
            rows: [['HeadingNode', 'LWW-Register']]
          }
        ]
      }
    };

    const doc = buildDocumentFromAST(sampleDocData);
    assert.equal(doc.id, 'doc-sample-1');
    assert.equal(doc.title, 'SyncDoc Architecture & AST Conflict Resolution Spec');

    const stats = doc.traceRelationships();
    assert.equal(stats.totalBlocks, 4);
    assert.equal(stats.maxDepth, 0);

    assert.equal(doc.treeStats.totalBlocks, 4);

    const codeBlock = doc.findBlockById('blk-105');
    assert.ok(codeBlock);
    assert.equal(codeBlock.conflict.id, 'cnf-901');
    assert.equal(codeBlock.relationships.prevSiblingId, 'blk-102');
    assert.equal(codeBlock.relationships.nextSiblingId, 'blk-109');
  });
});
