import * as Y from "yjs";
import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { persistYjsToMongo } from "./persistence";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

const docs = new Map<string, Y.Doc>();
const awarenessStates = new Map<string, awarenessProtocol.Awareness>();
const saveTimers = new Map<string, NodeJS.Timeout>();
const SAVE_DEBOUNCE_MS = 2000;

const getOrCreateDoc = (documentId: string): { doc: Y.Doc; awareness: awarenessProtocol.Awareness } => {
  let doc = docs.get(documentId);
  let awareness = awarenessStates.get(documentId);

  if (!doc) {
    doc = new Y.Doc();
    awareness = new awarenessProtocol.Awareness(doc);
    docs.set(documentId, doc);
    awarenessStates.set(documentId, awareness);

    doc.on("update", () => {
      const existingTimer = saveTimers.get(documentId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        persistYjsToMongo(documentId, doc!);
      }, SAVE_DEBOUNCE_MS);

      saveTimers.set(documentId, timer);
    });
  }

  return { doc, awareness: awareness! };
};

const send = (conn: WebSocket, message: Uint8Array): void => {
  if (conn.readyState === WebSocket.OPEN) {
    conn.send(message);
  }
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
  const rawPath = req.url?.split("/yjs/")[1] ?? "";
  const documentId = (rawPath.split("?")[0] ?? "").replace(/\/$/, "");


    if (!documentId) {
      conn.close();
      return;
    }

    const { doc, awareness } = getOrCreateDoc(documentId);
    console.log(`Client connected to document: ${documentId}`);

    // --- Step 1: send initial sync step 1 to the newly connected client ---
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(conn, encoding.toUint8Array(encoder));

    // --- Step 2: send current awareness states (who else is online) ---
    const awarenessStatesMap = awareness.getStates();
    if (awarenessStatesMap.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStatesMap.keys()))
      );
      send(conn, encoding.toUint8Array(awarenessEncoder));
    }

    // --- Handle incoming messages from this client ---
    conn.on("message", (data: Buffer) => {
      const decoder = decoding.createDecoder(new Uint8Array(data));
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC: {
          const responseEncoder = encoding.createEncoder();
          encoding.writeVarUint(responseEncoder, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(decoder, responseEncoder, doc, conn);

          if (encoding.length(responseEncoder) > 1) {
            send(conn, encoding.toUint8Array(responseEncoder));
          }
          break;
        }
        case MESSAGE_AWARENESS: {
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            conn
          );
          break;
        }
      }
    });

    // --- Broadcast doc updates to all other clients on this document ---
    const updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin === conn) return; // don't echo back to the sender

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      send(conn, encoding.toUint8Array(encoder));
    };
    doc.on("update", updateHandler);

    // --- Broadcast awareness changes (cursors/presence) ---
    const awarenessChangeHandler = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown
    ) => {
      if (origin === conn) return;

      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      send(conn, encoding.toUint8Array(encoder));
    };
    awareness.on("change", awarenessChangeHandler);

    conn.on("close", () => {
      doc.off("update", updateHandler);
      awareness.off("change", awarenessChangeHandler);
      awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null);
      console.log(`Client disconnected from document: ${documentId}`);
    });
  });

  console.log("Yjs WebSocket server ready at /yjs");
};