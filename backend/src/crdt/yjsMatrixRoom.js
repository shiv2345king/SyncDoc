import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { OperationalLockManager } from './operationalLockManager.js';

/**
 * Yjs Document Matrix Room
 * Encapsulates the multi-layered CRDT matrix for a collaborative document session:
 * 1. Root AST shared array (`astBlocks`)
 * 2. Per-block sub-CRDT maps (`blockMatrix`: map of blockId -> Y.Map for atomic node property syncing)
 * 3. Lock State CRDT Map (`operationalLocks`: synchronized lock state matrix)
 * 4. User awareness / presence vector clocks
 * 5. Localized operational lock manager
 */
export class YjsMatrixRoom {
  constructor(roomName, { gc = true, defaultLockTtlMs = 30000 } = {}) {
    this.roomName = roomName;
    this.ydoc = new Y.Doc({ gc });
    this.awareness = new awarenessProtocol.Awareness(this.ydoc);
    this.awareness.setLocalState(null);

    // Connected WebSocket clients set
    this.conns = new Map(); // ws -> Set<number (controlled user ids)>

    // Localized Operational Block-Locking Manager
    this.lockManager = new OperationalLockManager({ defaultLockTtlMs });

    // CRDT Shared Data Structures
    this.yBlocks = this.ydoc.getArray('astBlocks');
    this.yBlockMatrix = this.ydoc.getMap('blockMatrix');
    this.yLocks = this.ydoc.getMap('operationalLocks');

    // Sync lock changes into CRDT Y.Map so peers observe in real-time
    this.lockManager.onLockChange((action, lockData, allLocks) => {
      this.ydoc.transact(() => {
        if (action === 'released' || action === 'expired') {
          this.yLocks.delete(lockData.blockId);
        } else if (action === 'acquired' || action === 'refreshed') {
          this.yLocks.set(lockData.blockId, lockData);
        }
      }, 'lock-manager');
    });

    // Cleanup interval for expired locks
    this.pruneInterval = setInterval(() => {
      this.lockManager.pruneExpired();
    }, 10000);
    // Unref timer so it doesn't block process/test shutdown
    if (this.pruneInterval && typeof this.pruneInterval.unref === 'function') {
      this.pruneInterval.unref();
    }
  }

  /**
   * Put/update an individual block node in the CRDT block matrix
   */
  setBlockInMatrix(blockId, blockData) {
    this.ydoc.transact(() => {
      let blockMap = this.yBlockMatrix.get(blockId);
      if (!blockMap) {
        blockMap = new Y.Map();
        this.yBlockMatrix.set(blockId, blockMap);
      }
      for (const [key, val] of Object.entries(blockData)) {
        blockMap.set(key, val);
      }
    }, 'matrix-update');
  }

  /**
   * Retrieve block node data from the CRDT matrix
   */
  getBlockFromMatrix(blockId) {
    const blockMap = this.yBlockMatrix.get(blockId);
    return blockMap ? blockMap.toJSON() : null;
  }

  /**
   * Acquire a localized lock on an AST block node
   */
  acquireBlockLock(blockId, clientInfo) {
    return this.lockManager.acquireLock(blockId, clientInfo);
  }

  /**
   * Release a localized lock on an AST block node
   */
  releaseBlockLock(blockId, holderId, force = false) {
    return this.lockManager.releaseLock(blockId, holderId, force);
  }

  /**
   * Check if a block is locked by another peer
   */
  isBlockLocked(blockId, currentHolderId) {
    return this.lockManager.isBlockLockedByOther(blockId, currentHolderId);
  }

  /**
   * Export summary of room matrix status
   */
  getMatrixStats() {
    return {
      roomName: this.roomName,
      clientsCount: this.conns.size,
      astBlockCount: this.yBlocks.length,
      matrixNodeCount: this.yBlockMatrix.size,
      activeLocks: this.lockManager.getAllActiveLocks(),
      activeLockCount: Object.keys(this.lockManager.getAllActiveLocks()).length
    };
  }

  destroy() {
    clearInterval(this.pruneInterval);
    this.awareness.destroy();
    this.ydoc.destroy();
  }
}

/**
 * Yjs Matrix Architectures Registry
 * Manages all active document rooms, dynamic routing, and resource disposal.
 */
export class YjsMatrixRegistry {
  constructor(options = {}) {
    this.options = options;
    // Map<roomName, YjsMatrixRoom>
    this.rooms = new Map();
  }

  getOrCreateRoom(roomName) {
    if (!this.rooms.has(roomName)) {
      const room = new YjsMatrixRoom(roomName, this.options);
      this.rooms.set(roomName, room);
    }
    return this.rooms.get(roomName);
  }

  getRoom(roomName) {
    return this.rooms.get(roomName) || null;
  }

  hasRoom(roomName) {
    return this.rooms.has(roomName);
  }

  removeRoom(roomName) {
    const room = this.rooms.get(roomName);
    if (room) {
      room.destroy();
      this.rooms.delete(roomName);
      return true;
    }
    return false;
  }

  getActiveRoomsCount() {
    return this.rooms.size;
  }

  getRoomsList() {
    return Array.from(this.rooms.values()).map(r => r.getMatrixStats());
  }
}

export const matrixRegistry = new YjsMatrixRegistry();
