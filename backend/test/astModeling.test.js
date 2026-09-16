import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DocumentModel,
  traceDocumentAST,
  ASTCycleError,
  ASTDuplicateIdError
} from '../src/models/index.js';
import { createASTNode } from '../src/utils/astBuilder.js';

describe('AST Relationship Tracer - Pure Function Unit Tests', () => {
  test('correctly traces flat root-level blocks', () => {
    const ast = {
      type: 'doc',
      version: 1,
      children: [
        createASTNode({ id: 'b1', type: 'heading', level: 1 }),
        createASTNode({ id: 'b2', type: 'paragraph' }),
        createASTNode({ id: 'b3', type: 'code' })
      ]
    };

    const stats = traceDocumentAST(ast);

    assert.equal(stats.totalBlocks, 3);
    assert.equal(stats.maxDepth, 0);

    const b1 = ast.children[0];
    const b2 = ast.children[1];
    const b3 = ast.children[2];

    // Check b1
    assert.equal(b1.relationships.parentId, null);
    assert.equal(b1.relationships.depth, 0);
    assert.equal(b1.relationships.path, '/root/b1');
    assert.deepEqual(b1.relationships.pathArray, []);
    assert.equal(b1.relationships.index, 0);
    assert.equal(b1.relationships.prevSiblingId, null);
    assert.equal(b1.relationships.nextSiblingId, 'b2');
    assert.equal(b1.relationships.childCount, 0);
    assert.equal(b1.relationships.isLeaf, true);

    // Check b2
    assert.equal(b2.relationships.parentId, null);
    assert.equal(b2.relationships.depth, 0);
    assert.equal(b2.relationships.path, '/root/b2');
    assert.equal(b2.relationships.index, 1);
    assert.equal(b2.relationships.prevSiblingId, 'b1');
    assert.equal(b2.relationships.nextSiblingId, 'b3');
    assert.equal(b2.relationships.childCount, 0);
    assert.equal(b2.relationships.isLeaf, true);

    // Check b3
    assert.equal(b3.relationships.parentId, null);
    assert.equal(b3.relationships.depth, 0);
    assert.equal(b3.relationships.path, '/root/b3');
    assert.equal(b3.relationships.index, 2);
    assert.equal(b3.relationships.prevSiblingId, 'b2');
    assert.equal(b3.relationships.nextSiblingId, null);
    assert.equal(b3.relationships.childCount, 0);
    assert.equal(b3.relationships.isLeaf, true);
  });

  test('correctly traces multi-level nested children and recursive descendants', () => {
    // Tree structure:
    // root
    //  ├── parent-1
    //  │     ├── child-1.1
    //  │     │     └── grand-1.1.1
    //  │     └── child-1.2
    //  └── parent-2
    const ast = {
      type: 'doc',
      version: 1,
      children: [
        createASTNode({
          id: 'parent-1',
          type: 'container',
          children: [
            createASTNode({
              id: 'child-1.1',
              type: 'callout',
              variant: 'info',
              children: [
                createASTNode({ id: 'grand-1.1.1', type: 'paragraph' })
              ]
            }),
            createASTNode({ id: 'child-1.2', type: 'quote' })
          ]
        }),
        createASTNode({ id: 'parent-2', type: 'paragraph' })
      ]
    };

    const stats = traceDocumentAST(ast);

    assert.equal(stats.totalBlocks, 5);
    assert.equal(stats.maxDepth, 2);

    const parent1 = ast.children[0];
    const child11 = parent1.children[0];
    const grand111 = child11.children[0];
    const child12 = parent1.children[1];
    const parent2 = ast.children[1];

    // parent-1
    assert.equal(parent1.relationships.parentId, null);
    assert.equal(parent1.relationships.depth, 0);
    assert.equal(parent1.relationships.path, '/root/parent-1');
    assert.equal(parent1.relationships.childCount, 2);
    assert.equal(parent1.relationships.descendantCount, 3); // child-1.1, grand-1.1.1, child-1.2
    assert.equal(parent1.relationships.isLeaf, false);
    assert.equal(parent1.relationships.nextSiblingId, 'parent-2');

    // child-1.1
    assert.equal(child11.relationships.parentId, 'parent-1');
    assert.equal(child11.relationships.depth, 1);
    assert.equal(child11.relationships.path, '/root/parent-1/child-1.1');
    assert.deepEqual(child11.relationships.pathArray, ['parent-1']);
    assert.equal(child11.relationships.index, 0);
    assert.equal(child11.relationships.prevSiblingId, null);
    assert.equal(child11.relationships.nextSiblingId, 'child-1.2');
    assert.equal(child11.relationships.childCount, 1);
    assert.equal(child11.relationships.descendantCount, 1);
    assert.equal(child11.relationships.isLeaf, false);

    // grand-1.1.1
    assert.equal(grand111.relationships.parentId, 'child-1.1');
    assert.equal(grand111.relationships.depth, 2);
    assert.equal(grand111.relationships.path, '/root/parent-1/child-1.1/grand-1.1.1');
    assert.deepEqual(grand111.relationships.pathArray, ['parent-1', 'child-1.1']);
    assert.equal(grand111.relationships.index, 0);
    assert.equal(grand111.relationships.prevSiblingId, null);
    assert.equal(grand111.relationships.nextSiblingId, null);
    assert.equal(grand111.relationships.childCount, 0);
    assert.equal(grand111.relationships.descendantCount, 0);
    assert.equal(grand111.relationships.isLeaf, true);

    // child-1.2
    assert.equal(child12.relationships.parentId, 'parent-1');
    assert.equal(child12.relationships.depth, 1);
    assert.equal(child12.relationships.index, 1);
    assert.equal(child12.relationships.prevSiblingId, 'child-1.1');
    assert.equal(child12.relationships.nextSiblingId, null);
    assert.equal(child12.relationships.childCount, 0);
    assert.equal(child12.relationships.descendantCount, 0);
    assert.equal(child12.relationships.isLeaf, true);

    // parent-2
    assert.equal(parent2.relationships.parentId, null);
    assert.equal(parent2.relationships.depth, 0);
    assert.equal(parent2.relationships.index, 1);
    assert.equal(parent2.relationships.prevSiblingId, 'parent-1');
    assert.equal(parent2.relationships.nextSiblingId, null);
    assert.equal(parent2.relationships.childCount, 0);
    assert.equal(parent2.relationships.isLeaf, true);
  });

  test('throws ASTDuplicateIdError on duplicate block IDs', () => {
    const ast = {
      type: 'doc',
      version: 1,
      children: [
        createASTNode({ id: 'dup-1', type: 'paragraph' }),
        createASTNode({
          id: 'container-x',
          type: 'container',
          children: [
            createASTNode({ id: 'dup-1', type: 'heading', level: 2 })
          ]
        })
      ]
    };

    assert.throws(
      () => traceDocumentAST(ast),
      ASTDuplicateIdError
    );
  });

  test('throws ASTCycleError when circular child reference is detected', () => {
    const nodeA = createASTNode({ id: 'cycle-a', type: 'container', children: [] });
    const nodeB = createASTNode({ id: 'cycle-b', type: 'container', children: [nodeA] });
    nodeA.children.push(nodeB); // A -> B -> A

    const ast = {
      type: 'doc',
      version: 1,
      children: [nodeA]
    };

    assert.throws(
      () => traceDocumentAST(ast),
      ASTCycleError
    );
  });
});

describe('Mongoose Document Model - Pre-Save Hook & Helper Methods', () => {
  test('executes pre-save hook on document validate and traces nested AST', async () => {
    const doc = new DocumentModel({
      id: 'doc-test-1',
      title: 'Testing AST Schemas',
      author: 'Tester',
      ast: {
        type: 'doc',
        version: 1,
        children: [
          {
            id: 'h1',
            type: 'heading',
            level: 1,
            content: [{ text: 'Title text', format: { bold: true } }]
          },
          {
            id: 'p1',
            type: 'paragraph',
            content: [{ text: 'Body paragraph' }],
            children: [
              {
                id: 'code1',
                type: 'code',
                language: 'typescript',
                content: 'const x: number = 42;'
              }
            ]
          }
        ]
      }
    });

    // Mongoose validate() triggers schema validation
    await doc.validate();

    // Calling traceRelationships manually or before save
    const stats = doc.traceRelationships();
    assert.equal(stats.totalBlocks, 3);
    assert.equal(stats.maxDepth, 1);

    const heading = doc.findBlockById('h1');
    const paragraph = doc.findBlockById('p1');
    const code = doc.findBlockById('code1');

    assert.ok(heading);
    assert.ok(paragraph);
    assert.ok(code);

    assert.equal(heading.relationships.parentId, null);
    assert.equal(heading.relationships.nextSiblingId, 'p1');

    assert.equal(paragraph.relationships.prevSiblingId, 'h1');
    assert.equal(paragraph.relationships.childCount, 1);
    assert.equal(paragraph.relationships.descendantCount, 1);

    assert.equal(code.relationships.parentId, 'p1');
    assert.equal(code.relationships.depth, 1);
    assert.equal(code.relationships.path, '/root/p1/code1');
    assert.deepEqual(code.relationships.pathArray, ['p1']);
    assert.equal(code.relationships.isLeaf, true);

    // Test helper methods
    const flattened = doc.getFlattenedBlocks();
    assert.equal(flattened.length, 3);
    assert.deepEqual(flattened.map(b => b.id), ['h1', 'p1', 'code1']);

    const pChildren = doc.getChildrenOf('p1');
    assert.equal(pChildren.length, 1);
    assert.equal(pChildren[0].id, 'code1');

    const hSiblings = doc.getSiblingsOf('h1');
    assert.equal(hSiblings.length, 1);
    assert.equal(hSiblings[0].id, 'p1');
  });

  test('validates nested schema restrictions (e.g. heading level 1-6, invalid block type)', async () => {
    const invalidDoc = new DocumentModel({
      id: 'doc-invalid',
      title: 'Bad Level',
      author: 'Tester',
      ast: {
        type: 'doc',
        version: 1,
        children: [
          {
            id: 'bad-heading',
            type: 'heading',
            level: 9 // Invalid: level must be 1..6
          }
        ]
      }
    });

    await assert.rejects(
      async () => {
        await invalidDoc.validate();
      },
      /Path `level` \(9\) is more than maximum allowed value \(6\)/
    );

    const invalidTypeDoc = new DocumentModel({
      id: 'doc-invalid-type',
      title: 'Bad Type',
      author: 'Tester',
      ast: {
        type: 'doc',
        version: 1,
        children: [
          {
            id: 'bad-type',
            type: 'invalid_type_name'
          }
        ]
      }
    });

    await assert.rejects(
      async () => {
        await invalidTypeDoc.validate();
      },
      /Invalid AST block type/
    );
  });
});
