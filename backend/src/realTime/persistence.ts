import * as Y from "yjs";
import { BlockNode } from "../models/BlockNodeModel";

// Call this periodically (e.g. every few seconds) or on a debounce after edits stop
export const persistYjsToMongo = async (documentId: string, ydoc: Y.Doc): Promise<void> => {
  const yBlocks = ydoc.getMap("blocks"); // structure depends on how you map AST -> Yjs types

  yBlocks.forEach(async (yBlock: any, blockId: string) => {
    await BlockNode.findByIdAndUpdate(blockId, {
      content: yBlock.get("content"),
    });
  });
};