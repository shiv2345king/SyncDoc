import { WebSocketServer, WebSocket } from 'ws';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { matrixRegistry } from './yjsMatrixRoom.js';

// Message types following standard y-websocket protocol extensions
export const MESSAGE_TYPES = {
  SYNC: 0,
  AWARENESS: 1,
  // Custom operational lock messages (JSON or binary multiplexed)
  CUSTOM_LOCK_OP: 10,
  QUERY_LOCKS: 11
};

export const LOCK_ACTIONS = {
  ACQUIRE: 'ACQUIRE_LOCK',
  RELEASE: 'RELEASE_LOCK',
  REFRESH: 'REFRESH_LOCK',
  LOCKS_SYNC: 'LOCKS_SYNC',
  LOCK_ACQUIRED: 'LOCK_ACQUIRED',
  LOCK_REJECTED: 'LOCK_REJECTED',
  LOCK_RELEASED: 'LOCK_RELEASED'
};

/**
 * Sends a binary message safely to a WebSocket connection
 */
function sendBinary(conn, message) {
  if (conn.readyState !== WebSocket.OPEN) return;
  try {
    conn.send(message, (err) => {
      if (err != null) console.error('[SyncDoc WS] Send error:', err.message);
    });
  } catch (e) {
    console.error('[SyncDoc WS] Send exception:', e.message);
  }
}

/**
 * Sends a custom operational lock JSON message over WebSocket
 */
export function sendLockMessage(conn, payload) {
  if (conn.readyState !== WebSocket.OPEN) return;
  const jsonStr = JSON.stringify(payload);
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_TYPES.CUSTOM_LOCK_OP);
  encoding.writeVarString(encoder, jsonStr);
  sendBinary(conn, encoding.toUint8Array(encoder));
}

/**
 * Broadcasts lock state changes to all peers in a matrix room
 */
export function broadcastLockEvent(room, payload, excludeConn = null) {
  const jsonStr = JSON.stringify(payload);
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_TYPES.CUSTOM_LOCK_OP);
  encoding.writeVarString(encoder, jsonStr);
  const msg = encoding.toUint8Array(encoder);

  for (const conn of room.conns.keys()) {
    if (conn !== excludeConn && conn.readyState === WebSocket.OPEN) {
      sendBinary(conn, msg);
    }
  }
}

/**
 * Handles incoming WebSocket connection and attaches it to the target Yjs matrix room
 */
export function setupWSConnection(conn, req, { roomName, matrix = matrixRegistry } = {}) {
  conn.binaryType = 'arraybuffer';

  // Extract roomName from URL path if not explicitly provided (e.g. /ws/rooms/:roomName or ?room=xyz)
  if (!roomName) {
    const url = new URL(req.url, 'http://localhost');
    const pathParts = url.pathname.split('/').filter(Boolean);
    roomName = url.searchParams.get('room') || pathParts[pathParts.length - 1] || 'syncdoc-default';
  }

  const room = matrix.getOrCreateRoom(roomName);
  room.conns.set(conn, new Set());

  // Track the client holder ID for automatic lock release on disconnect
  let boundHolderId = null;

  // 1. Send sync step 1: server sends its state vector to client
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_TYPES.SYNC);
    syncProtocol.writeSyncStep1(encoder, room.ydoc);
    sendBinary(conn, encoding.toUint8Array(encoder));

    // Send awareness state
    const awarenessStates = room.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_TYPES.AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(awarenessStates.keys()))
      );
      sendBinary(conn, encoding.toUint8Array(awarenessEncoder));
    }

    // Send active block locks immediately upon connection
    sendLockMessage(conn, {
      action: LOCK_ACTIONS.LOCKS_SYNC,
      roomName,
      locks: room.lockManager.getAllActiveLocks()
    });
  }

  // 2. Setup document update listener: forward updates to all peers in room
  const docUpdateHandler = (update, origin) => {
    if (origin !== conn) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_TYPES.SYNC);
      syncProtocol.writeUpdate(encoder, update);
      sendBinary(conn, encoding.toUint8Array(encoder));
    }
  };
  room.ydoc.on('update', docUpdateHandler);

  // 3. Setup awareness change listener
  const awarenessChangeHandler = ({ added, updated, removed }, origin) => {
    const changedClients = added.concat(updated, removed);
    const connControlledIDs = room.conns.get(conn);
    if (connControlledIDs !== undefined) {
      added.forEach(clientID => { connControlledIDs.add(clientID); });
      removed.forEach(clientID => { connControlledIDs.delete(clientID); });
    }
    // Broadcast awareness update
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_TYPES.AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, changedClients)
    );
    const buff = encoding.toUint8Array(encoder);
    room.conns.forEach((_, c) => {
      sendBinary(c, buff);
    });
  };
  room.awareness.on('update', awarenessChangeHandler);

  // 4. Handle incoming messages from client
  conn.on('message', (message) => {
    try {
      const uint8 = new Uint8Array(message);
      const decoder = decoding.createDecoder(uint8);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_TYPES.SYNC: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_TYPES.SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, room.ydoc, conn);
          if (encoding.length(encoder) > 1) {
            sendBinary(conn, encoding.toUint8Array(encoder));
          }
          break;
        }

        case MESSAGE_TYPES.AWARENESS: {
          const update = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(room.awareness, update, conn);
          break;
        }

        case MESSAGE_TYPES.CUSTOM_LOCK_OP: {
          const payloadStr = decoding.readVarString(decoder);
          let payload;
          try {
            payload = JSON.parse(payloadStr);
          } catch (e) {
            console.error('[SyncDoc WS] Invalid JSON in lock payload:', e);
            break;
          }

          handleLockOperation(conn, room, payload, (id) => { boundHolderId = id; });
          break;
        }

        default:
          console.warn('[SyncDoc WS] Unknown message type:', messageType);
      }
    } catch (err) {
      console.error('[SyncDoc WS] Message handling error:', err);
    }
  });

  // 5. Handle connection closure & resource cleanup
  const closeHandler = () => {
    if (room.conns.has(conn)) {
      const controlledIds = room.conns.get(conn);
      room.conns.delete(conn);
      awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(controlledIds), null);

      // Release all operational block locks held by this disconnected client
      if (boundHolderId) {
        const releasedBlocks = room.lockManager.releaseAllForHolder(boundHolderId);
        if (releasedBlocks.length > 0) {
          broadcastLockEvent(room, {
            action: LOCK_ACTIONS.LOCK_RELEASED,
            holderId: boundHolderId,
            releasedBlocks,
            allLocks: room.lockManager.getAllActiveLocks()
          });
        }
      }

      room.ydoc.off('update', docUpdateHandler);

      // Clean up empty room if no connections remain
      if (room.conns.size === 0) {
        // We keep room alive for reconnects or remove based on policy
      }
    }
  };

  conn.on('close', closeHandler);
  conn.on('error', closeHandler);
}

/**
 * Processes localized block-locking operational commands
 */
function handleLockOperation(conn, room, payload, setHolderId) {
  const { action, blockId, holderId, holderName, holderColor, ttlMs } = payload;

  if (holderId) {
    setHolderId(holderId);
  }

  switch (action) {
    case LOCK_ACTIONS.ACQUIRE: {
      const result = room.acquireBlockLock(blockId, { holderId, holderName, holderColor, ttlMs });

      if (result.success) {
        // Send success to requester
        sendLockMessage(conn, {
          action: LOCK_ACTIONS.LOCK_ACQUIRED,
          blockId,
          lock: result.lock,
          allLocks: room.lockManager.getAllActiveLocks()
        });

        // Broadcast to other peers in room so they lock their UI for this block
        broadcastLockEvent(room, {
          action: LOCK_ACTIONS.LOCKS_SYNC,
          updatedBlockId: blockId,
          allLocks: room.lockManager.getAllActiveLocks()
        }, conn);
      } else {
        // Send rejection to requester
        sendLockMessage(conn, {
          action: LOCK_ACTIONS.LOCK_REJECTED,
          blockId,
          reason: result.reason,
          currentLock: result.currentLock,
          allLocks: room.lockManager.getAllActiveLocks()
        });
      }
      break;
    }

    case LOCK_ACTIONS.RELEASE: {
      const result = room.releaseBlockLock(blockId, holderId);

      sendLockMessage(conn, {
        action: LOCK_ACTIONS.LOCK_RELEASED,
        blockId,
        success: result.success,
        allLocks: room.lockManager.getAllActiveLocks()
      });

      broadcastLockEvent(room, {
        action: LOCK_ACTIONS.LOCKS_SYNC,
        releasedBlockId: blockId,
        allLocks: room.lockManager.getAllActiveLocks()
      }, conn);
      break;
    }

    case LOCK_ACTIONS.REFRESH: {
      const result = room.acquireBlockLock(blockId, { holderId, holderName, holderColor, ttlMs });
      sendLockMessage(conn, {
        action: result.success ? LOCK_ACTIONS.LOCK_ACQUIRED : LOCK_ACTIONS.LOCK_REJECTED,
        blockId,
        lock: result.lock,
        allLocks: room.lockManager.getAllActiveLocks()
      });
      break;
    }

    case 'QUERY_LOCKS': {
      sendLockMessage(conn, {
        action: LOCK_ACTIONS.LOCKS_SYNC,
        allLocks: room.lockManager.getAllActiveLocks()
      });
      break;
    }

    default:
      console.warn('[SyncDoc WS] Unknown lock action:', action);
  }
}

/**
 * Creates and configures the WebSocket Server with matrix routing
 */
export function createWebSocketRoutingServer({ server, path = '/crdt-sync', matrix = matrixRegistry } = {}) {
  const wss = new WebSocketServer({
    server,
    noServer: !server,
    path
  });

  wss.on('connection', (conn, req) => {
    setupWSConnection(conn, req, { matrix });
  });

  return wss;
}
