import * as Y from "yjs";
import { BlockNode } from "../models/BlockNodeModel";

// Call this periodically (e.g. every few seconds) or on a debounce after edits stop
export const persistYjsToMongo = async (documentId: string, ydoc: Y.Doc): Promise<void> => {
  const yBlocks = ydoc.getMap("blocks"); // structure depends on how you map AST -> Yjs types

  const updates = Array.from(yBlocks.entries()).map(async ([blockId, yBlock]: [string, any]) => {
    try {
      await BlockNode.findByIdAndUpdate(blockId, {
        content: yBlock.get("content"),
      });
    } catch (err) {
      console.error(`Failed to persist block ${blockId}:`, (err as Error).message);
    }
  });

  await Promise.all(updates);
};