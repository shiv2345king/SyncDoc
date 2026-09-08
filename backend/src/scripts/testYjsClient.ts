import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import ws from "ws";

// Yjs's browser provider expects a WebSocket global — patch it for Node
(global as any).WebSocket = ws;

const clientLabel = process.argv[2] || "client";
const documentId = "test-doc-123";

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  "ws://localhost:5000/yjs",
  documentId,
  ydoc
);

const yBlocks = ydoc.getMap("blocks");

provider.on("status", (event: { status: string }) => {
  console.log(`[${clientLabel}] connection status:`, event.status);
});

// Log every change this client sees (from itself or the other client)
yBlocks.observe(() => {
  console.log(`[${clientLabel}] blocks map changed:`, yBlocks.toJSON());
});

// After 2s, make an edit (only from "client1")
if (clientLabel === "client1") {
  setTimeout(() => {
    console.log(`[${clientLabel}] making an edit...`);
    const block = new Y.Map();
    block.set("content", "Hello from client1");
    yBlocks.set("block-1", block);
  }, 2000);
}