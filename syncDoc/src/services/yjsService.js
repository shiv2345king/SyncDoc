import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

class YjsCollaborationManager {
  constructor() {
    this.ydoc = new Y.Doc();
    this.provider = null;
    this.roomName = null;
    this.presenceListeners = new Set();
    this.docListeners = new Set();
    this.statusListeners = new Set();
    this.status = 'disconnected'; // 'connecting' | 'connected' | 'disconnected'
    this.localUser = {
      id: `client-${Math.floor(Math.random() * 10000)}`,
      name: 'Alex Rivers (You)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      color: '#6366f1',
      cursorBlockId: null,
      lastActive: new Date().toISOString()
    };
  }

  connect(roomName, serverUrl = 'wss://demos.yjs.dev') {
    if (this.provider) {
      this.disconnect();
    }

    this.roomName = roomName || 'syncdoc-default-room';
    this.ydoc = new Y.Doc();
    this.notifyStatus('connecting');

    try {
      this.provider = new WebsocketProvider(
        serverUrl,
        this.roomName,
        this.ydoc,
        { connect: true }
      );

      // Status listener
      this.provider.on('status', (event) => {
        this.status = event.status; // 'connected' or 'connecting' or 'disconnected'
        this.notifyStatus(this.status);
      });

      // Awareness / Presence handling
      const awareness = this.provider.awareness;

      // Set local user presence state
      awareness.setLocalStateField('user', this.localUser);

      // Listen for remote presence updates
      awareness.on('change', () => {
        const states = Array.from(awareness.getStates().values())
          .filter(state => state.user)
          .map(state => state.user);
        
        this.notifyPresence(states);
      });

      // Observe Yjs Shared AST Array
      const yBlocks = this.ydoc.getArray('astBlocks');
      yBlocks.observe(() => {
        const blocks = yBlocks.toArray();
        this.notifyDocChange(blocks);
      });

    } catch (err) {
      console.warn('Yjs WebSocket Connection Warning:', err);
      this.notifyStatus('disconnected');
    }
  }

  disconnect() {
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = null;
    }
    this.notifyStatus('disconnected');
  }

  updateLocalPresence(updates) {
    this.localUser = { ...this.localUser, ...updates, lastActive: new Date().toISOString() };
    if (this.provider && this.provider.awareness) {
      this.provider.awareness.setLocalStateField('user', this.localUser);
    }
  }

  syncBlocksToYjs(blocks) {
    if (!this.ydoc) return;
    const yBlocks = this.ydoc.getArray('astBlocks');
    this.ydoc.transact(() => {
      yBlocks.delete(0, yBlocks.length);
      yBlocks.insert(0, blocks);
    });
  }

  // Listener subscriptions
  onStatusChange(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onPresenceChange(listener) {
    this.presenceListeners.add(listener);
    return () => this.presenceListeners.delete(listener);
  }

  onDocChange(listener) {
    this.docListeners.add(listener);
    return () => this.docListeners.delete(listener);
  }

  notifyStatus(status) {
    this.status = status;
    this.statusListeners.forEach(fn => fn(status));
  }

  notifyPresence(presenceStates) {
    this.presenceListeners.forEach(fn => fn(presenceStates));
  }

  notifyDocChange(blocks) {
    this.docListeners.forEach(fn => fn(blocks));
  }

  getClientId() {
    return this.ydoc ? this.ydoc.clientID : 0;
  }

  getVectorClock() {
    return {
      clientID: this.getClientId(),
      guid: this.ydoc ? this.ydoc.guid : 'none',
      status: this.status
    };
  }
}

export const yjsService = new YjsCollaborationManager();
