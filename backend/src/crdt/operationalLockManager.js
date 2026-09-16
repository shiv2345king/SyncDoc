import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

/**
 * Operational Block Lock status
 */
export const LOCK_STATES = {
  FREE: 'free',
  EXCLUSIVE: 'exclusive',
  SHARED: 'shared'
};

/**
 * Localized Block Lock Entity
 */
export class BlockLock {
  constructor({
    blockId,
    holderId,
    holderName = 'Anonymous',
    holderColor = '#6366f1',
    mode = LOCK_STATES.EXCLUSIVE,
    ttlMs = 30000 // auto-expire lock if peer disconnects or goes idle
  }) {
    this.blockId = blockId;
    this.holderId = holderId;
    this.holderName = holderName;
    this.holderColor = holderColor;
    this.mode = mode;
    this.acquiredAt = Date.now();
    this.expiresAt = Date.now() + ttlMs;
    this.ttlMs = ttlMs;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  refresh(ttlMs = this.ttlMs) {
    this.expiresAt = Date.now() + ttlMs;
  }

  toJSON() {
    return {
      blockId: this.blockId,
      holderId: this.holderId,
      holderName: this.holderName,
      holderColor: this.holderColor,
      mode: this.mode,
      acquiredAt: this.acquiredAt,
      expiresAt: this.expiresAt,
      isExpired: this.isExpired()
    };
  }
}

/**
 * Localized Operational Block-Locking Manager
 * Manages atomic acquire/release/refresh and conflict detection on individual AST block nodes.
 */
export class OperationalLockManager {
  constructor({ defaultLockTtlMs = 30000 } = {}) {
    this.defaultLockTtlMs = defaultLockTtlMs;
    // Map<blockId, BlockLock>
    this.locks = new Map();
    // Listeners for lock state transitions
    this.listeners = new Set();
  }

  onLockChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify(action, lockData) {
    for (const fn of this.listeners) {
      try {
        fn(action, lockData, this.getAllActiveLocks());
      } catch (err) {
        console.error('Lock listener error:', err);
      }
    }
  }

  /**
   * Acquire exclusive lock on a specific AST block node
   */
  acquireLock(blockId, { holderId, holderName, holderColor, ttlMs = this.defaultLockTtlMs, mode = LOCK_STATES.EXCLUSIVE }) {
    if (!blockId || !holderId) {
      throw new Error('blockId and holderId are required to acquire block lock.');
    }

    const currentLock = this.locks.get(blockId);

    // If already locked by someone else and not expired, reject
    if (currentLock && !currentLock.isExpired()) {
      if (currentLock.holderId !== holderId) {
        return {
          success: false,
          reason: 'LOCKED_BY_PEER',
          currentLock: currentLock.toJSON()
        };
      }
      // Re-entrant lock by same holder: refresh TTL
      currentLock.refresh(ttlMs);
      this._notify('refreshed', currentLock.toJSON());
      return {
        success: true,
        action: 'refreshed',
        lock: currentLock.toJSON()
      };
    }

    // Free or expired: create new lock
    const newLock = new BlockLock({
      blockId,
      holderId,
      holderName,
      holderColor,
      mode,
      ttlMs
    });

    this.locks.set(blockId, newLock);
    this._notify('acquired', newLock.toJSON());

    return {
      success: true,
      action: 'acquired',
      lock: newLock.toJSON()
    };
  }

  /**
   * Release a held block lock
   */
  releaseLock(blockId, holderId, force = false) {
    const currentLock = this.locks.get(blockId);
    if (!currentLock) {
      return { success: true, action: 'noop' };
    }

    if (!force && currentLock.holderId !== holderId) {
      return {
        success: false,
        reason: 'NOT_LOCK_HOLDER',
        currentLock: currentLock.toJSON()
      };
    }

    this.locks.delete(blockId);
    this._notify('released', { blockId, holderId });

    return { success: true, action: 'released', blockId };
  }

  /**
   * Release all locks held by a specific client (e.g., when WebSocket disconnects)
   */
  releaseAllForHolder(holderId) {
    const released = [];
    for (const [blockId, lock] of this.locks.entries()) {
      if (lock.holderId === holderId) {
        this.locks.delete(blockId);
        released.push(blockId);
        this._notify('released', { blockId, holderId });
      }
    }
    return released;
  }

  /**
   * Check if a block is locked by someone else
   */
  isBlockLockedByOther(blockId, holderId) {
    const lock = this.locks.get(blockId);
    if (!lock || lock.isExpired()) return false;
    return lock.holderId !== holderId;
  }

  getLock(blockId) {
    const lock = this.locks.get(blockId);
    if (!lock) return null;
    if (lock.isExpired()) {
      this.locks.delete(blockId);
      return null;
    }
    return lock.toJSON();
  }

  getAllActiveLocks() {
    const now = Date.now();
    const result = {};
    for (const [blockId, lock] of this.locks.entries()) {
      if (lock.expiresAt > now) {
        result[blockId] = lock.toJSON();
      } else {
        this.locks.delete(blockId);
      }
    }
    return result;
  }

  /**
   * Prune expired locks periodically
   */
  pruneExpired() {
    const now = Date.now();
    const pruned = [];
    for (const [blockId, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(blockId);
        pruned.push(blockId);
        this._notify('expired', { blockId, holderId: lock.holderId });
      }
    }
    return pruned;
  }
}
