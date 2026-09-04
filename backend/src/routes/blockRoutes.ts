import { Router, Response } from "express";
import { BlockNode } from "../models/BlockNodeModel";
import { protect, AuthenticatedRequest } from "../middleware/authMiddleware";

const router = Router();

// Create a new block
router.post("/", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId, type, content, parentId, order } = req.body;

    if (!documentId || !type || order === undefined) {
      return res.status(400).json({ message: "documentId, type, and order are required" });
    }

    const block = await BlockNode.create({
      documentId,
      type,
      content: content || "",
      parentId: parentId || null,
      order,
      children: [],
    });

    res.status(201).json(block);
  } catch (err) {
    console.error("Create block error:", err);
    res.status(400).json({ message: (err as Error).message });
  }
});

// Update a block's content
router.patch("/:id", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content } = req.body;

    const block = await BlockNode.findByIdAndUpdate(
      req.params.id,
      { content },
      { new: true, runValidators: true }
    );

    if (!block) {
      return res.status(404).json({ message: "Block not found" });
    }

    res.json(block);
  } catch (err) {
    console.error("Update block error:", err);
    res.status(400).json({ message: (err as Error).message });
  }
});

// Delete a block
router.delete("/:id", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const block = await BlockNode.findByIdAndDelete(req.params.id);

    if (!block) {
      return res.status(404).json({ message: "Block not found" });
    }

    res.json({ message: "Block deleted" });
  } catch (err) {
    console.error("Delete block error:", err);
    res.status(500).json({ message: "Something went wrong deleting the block" });
  }
});

export default router;