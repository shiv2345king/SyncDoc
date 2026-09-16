export {
  OperationalLockManager,
  BlockLock,
  LOCK_STATES
} from './operationalLockManager.js';

export {
  YjsMatrixRoom,
  YjsMatrixRegistry,
  matrixRegistry
} from './yjsMatrixRoom.js';

export {
  createWebSocketRoutingServer,
  setupWSConnection,
  sendLockMessage,
  broadcastLockEvent,
  MESSAGE_TYPES,
  LOCK_ACTIONS
} from './wsRoutingServer.js';
