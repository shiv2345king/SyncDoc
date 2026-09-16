import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  OperationalLockManager,
  LOCK_STATES
} from '../src/crdt/operationalLockManager.js';
import {
  YjsMatrixRoom,
  YjsMatrixRegistry
} from '../src/crdt/yjsMatrixRoom.js';

describe('OperationalLockManager - Unit Tests', () => {
  let lockManager;

  beforeEach(() => {
    lockManager = new OperationalLockManager({ defaultLockTtlMs: 5000 });
  });

  test('successfully acquires lock on an unlocked block', () => {
    const res = lockManager.acquireLock('blk-101', {
      holderId: 'user-1',
      holderName: 'Alex Rivers',
      holderColor: '#6366f1'
    });

    assert.equal(res.success, true);
    assert.equal(res.action, 'acquired');
    assert.equal(res.lock.blockId, 'blk-101');
    assert.equal(res.lock.holderId, 'user-1');

    const lock = lockManager.getLock('blk-101');
    assert.ok(lock);
    assert.equal(lock.holderName, 'Alex Rivers');
  });

  test('rejects lock attempt from another peer when block is exclusively locked', () => {
    lockManager.acquireLock('blk-101', {
      holderId: 'user-1',
      holderName: 'Alex'
    });

    const res = lockManager.acquireLock('blk-101', {
      holderId: 'user-2',
      holderName: 'Elena'
    });

    assert.equal(res.success, false);
    assert.equal(res.reason, 'LOCKED_BY_PEER');
    assert.equal(res.currentLock.holderId, 'user-1');

    assert.equal(lockManager.isBlockLockedByOther('blk-101', 'user-2'), true);
    assert.equal(lockManager.isBlockLockedByOther('blk-101', 'user-1'), false);
  });

  test('refreshes lock when re-requested by same lock holder', () => {
    const res1 = lockManager.acquireLock('blk-101', {
      holderId: 'user-1',
      ttlMs: 2000
    });
    const exp1 = res1.lock.expiresAt;

    const res2 = lockManager.acquireLock('blk-101', {
      holderId: 'user-1',
      ttlMs: 10000
    });

    assert.equal(res2.success, true);
    assert.equal(res2.action, 'refreshed');
    assert.ok(res2.lock.expiresAt > exp1);
  });

  test('allows release by holder and rejects release by other peer', () => {
    lockManager.acquireLock('blk-101', { holderId: 'user-1' });

    // Unauthorized release
    const resUnauthorized = lockManager.releaseLock('blk-101', 'user-2');
    assert.equal(resUnauthorized.success, false);
    assert.equal(resUnauthorized.reason, 'NOT_LOCK_HOLDER');

    // Authorized release
    const resAuthorized = lockManager.releaseLock('blk-101', 'user-1');
    assert.equal(resAuthorized.success, true);
    assert.equal(resAuthorized.action, 'released');

    assert.equal(lockManager.getLock('blk-101'), null);
  });

  test('releases all locks held by a disconnected holder', () => {
    lockManager.acquireLock('blk-1', { holderId: 'user-1' });
    lockManager.acquireLock('blk-2', { holderId: 'user-1' });
    lockManager.acquireLock('blk-3', { holderId: 'user-2' });

    const released = lockManager.releaseAllForHolder('user-1');
    assert.equal(released.length, 2);
    assert.ok(released.includes('blk-1'));
    assert.ok(released.includes('blk-2'));

    assert.equal(lockManager.getLock('blk-1'), null);
    assert.equal(lockManager.getLock('blk-2'), null);
    assert.ok(lockManager.getLock('blk-3'));
  });

  test('automatically prunes expired locks and allows new acquisitions', async () => {
    lockManager.acquireLock('blk-expire', {
      holderId: 'user-1',
      ttlMs: 50 // short TTL
    });

    assert.ok(lockManager.getLock('blk-expire'));

    await new Promise(r => setTimeout(r, 65));

    // Expired
    assert.equal(lockManager.getLock('blk-expire'), null);

    // Another user can now acquire it cleanly
    const res = lockManager.acquireLock('blk-expire', { holderId: 'user-2' });
    assert.equal(res.success, true);
    assert.equal(res.lock.holderId, 'user-2');
  });
});

describe('YjsMatrixRoom & Registry - Architecture Tests', () => {
  let registry;

  beforeEach(() => {
    registry = new YjsMatrixRegistry();
  });

  afterEach(() => {
    for (const room of registry.rooms.values()) {
      room.destroy();
    }
  });

  test('creates room with Yjs CRDT shared data structures', () => {
    const room = registry.getOrCreateRoom('doc-test-1');
    assert.ok(room);
    assert.equal(room.roomName, 'doc-test-1');

    assert.ok(room.ydoc);
    assert.ok(room.awareness);
    assert.ok(room.yBlocks);
    assert.ok(room.yBlockMatrix);
    assert.ok(room.yLocks);
  });

  test('synchronizes block locks into Yjs CRDT matrix map', () => {
    const room = registry.getOrCreateRoom('doc-test-sync');

    // Acquire lock via room
    const lockRes = room.acquireBlockLock('blk-crdt-1', {
      holderId: 'client-99',
      holderName: 'Marcus Chen',
      holderColor: '#10b981'
    });

    assert.equal(lockRes.success, true);

    // Check CRDT Y.Map
    const crdtLock = room.yLocks.get('blk-crdt-1');
    assert.ok(crdtLock);
    assert.equal(crdtLock.holderName, 'Marcus Chen');

    // Release lock
    room.releaseBlockLock('blk-crdt-1', 'client-99');
    assert.equal(room.yLocks.get('blk-crdt-1'), undefined);
  });

  test('manages per-block sub-CRDT matrix entries', () => {
    const room = registry.getOrCreateRoom('doc-test-matrix');

    room.setBlockInMatrix('blk-101', {
      type: 'heading',
      level: 1,
      content: 'Hello CRDT'
    });

    const blockData = room.getBlockFromMatrix('blk-101');
    assert.equal(blockData.type, 'heading');
    assert.equal(blockData.level, 1);
    assert.equal(blockData.content, 'Hello CRDT');

    const stats = room.getMatrixStats();
    assert.equal(stats.matrixNodeCount, 1);
  });
});
