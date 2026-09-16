import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import {
  createWebSocketRoutingServer,
  YjsMatrixRegistry,
  MESSAGE_TYPES,
  LOCK_ACTIONS
} from '../src/crdt/index.js';

describe('WebSocket Routing Server & CRDT Sync Integration Tests', () => {
  let server;
  let wss;
  let port;
  let matrix;

  before(async () => {
    matrix = new YjsMatrixRegistry();
    server = http.createServer();
    wss = createWebSocketRoutingServer({ server, path: '/crdt-sync', matrix });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    for (const room of matrix.rooms.values()) {
      room.destroy();
    }
    for (const client of wss.clients) {
      client.terminate();
    }
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  });

  function createClientWs(roomName) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/crdt-sync?room=${roomName}`);
    ws.binaryType = 'arraybuffer';
    return ws;
  }

  test('client connects and receives initial SYNC step and LOCKS_SYNC payload', async () => {
    const ws = createClientWs('doc-ws-test-1');
    const receivedMessages = [];

    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 3000);
      ws.on('message', (data) => {
        const uint8 = new Uint8Array(data);
        const decoder = decoding.createDecoder(uint8);
        const msgType = decoding.readVarUint(decoder);

        if (msgType === MESSAGE_TYPES.SYNC) {
          receivedMessages.push('SYNC');
        } else if (msgType === MESSAGE_TYPES.CUSTOM_LOCK_OP) {
          const jsonStr = decoding.readVarString(decoder);
          const payload = JSON.parse(jsonStr);
          receivedMessages.push(payload.action);
        }

        if (receivedMessages.includes('SYNC') && receivedMessages.includes(LOCK_ACTIONS.LOCKS_SYNC)) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    assert.ok(receivedMessages.includes('SYNC'));
    assert.ok(receivedMessages.includes(LOCK_ACTIONS.LOCKS_SYNC));

    ws.terminate();
    await new Promise(r => setTimeout(r, 50));
  });

  test('client acquires operational lock over WebSocket, and remote peer receives sync broadcast', async () => {
    const ws1 = createClientWs('doc-ws-locking');
    const ws2 = createClientWs('doc-ws-locking');

    // Wait for both connections to open
    await Promise.all([
      new Promise((res) => ws1.on('open', res)),
      new Promise((res) => ws2.on('open', res))
    ]);

    let ws1LockAcquired = false;
    let ws2LockNotified = false;

    // Listen on ws1
    ws1.on('message', (data) => {
      const uint8 = new Uint8Array(data);
      const decoder = decoding.createDecoder(uint8);
      const msgType = decoding.readVarUint(decoder);
      if (msgType === MESSAGE_TYPES.CUSTOM_LOCK_OP) {
        const payload = JSON.parse(decoding.readVarString(decoder));
        if (payload.action === LOCK_ACTIONS.LOCK_ACQUIRED && payload.blockId === 'blk-target-1') {
          ws1LockAcquired = true;
        }
      }
    });

    // Listen on ws2
    ws2.on('message', (data) => {
      const uint8 = new Uint8Array(data);
      const decoder = decoding.createDecoder(uint8);
      const msgType = decoding.readVarUint(decoder);
      if (msgType === MESSAGE_TYPES.CUSTOM_LOCK_OP) {
        const payload = JSON.parse(decoding.readVarString(decoder));
        if (payload.action === LOCK_ACTIONS.LOCKS_SYNC && payload.updatedBlockId === 'blk-target-1') {
          ws2LockNotified = true;
        }
      }
    });

    // Send lock acquire request from ws1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_TYPES.CUSTOM_LOCK_OP);
    encoding.writeVarString(encoder, JSON.stringify({
      action: LOCK_ACTIONS.ACQUIRE,
      blockId: 'blk-target-1',
      holderId: 'client-1',
      holderName: 'Alex'
    }));
    ws1.send(encoding.toUint8Array(encoder));

    // Wait for both to be notified
    for (let i = 0; i < 30; i++) {
      if (ws1LockAcquired && ws2LockNotified) break;
      await new Promise(r => setTimeout(r, 50));
    }

    assert.equal(ws1LockAcquired, true, 'ws1 should receive LOCK_ACQUIRED');
    assert.equal(ws2LockNotified, true, 'ws2 should receive LOCKS_SYNC broadcast for blk-target-1');

    ws1.close();
    ws2.close();
    await new Promise(r => setTimeout(r, 50));
  });
});
