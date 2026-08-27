import * as Y from "yjs";
import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { setupWSConnection } from "y-websocket/bin/utils";
import { persistYjsToMongo } from "./persistence";


const docs = new Map<string, Y.Doc>();
const saveTimers = new Map<string, NodeJS.Timeout>();

const SAVE_DEBOUNCE_MS = 2000;

const getOrCreateDoc = (documentId: string): Y.Doc => {
  let doc = docs.get(documentId);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(documentId, doc);

    // Whenever this doc changes, schedule a debounced save to Mongo
    doc.on("update", () => {
      const existingTimer = saveTimers.get(documentId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        persistYjsToMongo(documentId, doc!);
      }, SAVE_DEBOUNCE_MS);

      saveTimers.set(documentId, timer);
    });
  }
  return doc;
};

export const initYjsServer = (httpServer: Server): void => {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (!request.url?.startsWith("/yjs")) return;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (conn: WebSocket, req) => {
    const documentId = req.url?.split("/yjs/")[1];
    if (!documentId) {
      conn.close();
      return;
    }

    getOrCreateDoc(documentId); // ensures the doc exists + has the save listener attached

    setupWSConnection(conn, req, { docName: documentId, gc: true });

    console.log(`Client connected to document: ${documentId}`);
  });

  console.log("Yjs WebSocket server ready at /yjs");
};