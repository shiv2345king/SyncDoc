import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DocumentModel } from './models/Document.js';
import { createWebSocketRoutingServer, matrixRegistry } from './crdt/index.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncdoc';

export async function connectDB(uri = MONGODB_URI) {
  try {
    await mongoose.connect(uri);
    console.log(`[SyncDoc Backend] Connected to MongoDB: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('[SyncDoc Backend] MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Creates HTTP and WebSocket application server
 */
export function createServer() {
  const server = http.createServer((req, res) => {
    // Health and Matrix stats API
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    if (req.url === '/api/matrix/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        rooms: matrixRegistry.getRoomsList(),
        totalRooms: matrixRegistry.getActiveRoomsCount()
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  const wss = createWebSocketRoutingServer({ server, path: '/crdt-sync', matrix: matrixRegistry });

  return { server, wss, matrixRegistry };
}

export { DocumentModel, mongoose };

if (process.env.NODE_ENV !== 'test' && process.argv[1]?.endsWith('index.js')) {
  const { server } = createServer();
  connectDB().then(() => {
    server.listen(PORT, () => {
      console.log(`[SyncDoc Backend] CRDT WebSocket & AST Server listening on port ${PORT}`);
      console.log(`[SyncDoc Backend] WebSocket endpoint: ws://localhost:${PORT}/crdt-sync`);
    });
  }).catch(err => {
    console.error('Fatal initialization error:', err.message);
  });
}
