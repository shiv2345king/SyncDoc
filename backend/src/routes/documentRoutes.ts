import { Router, Response } from "express";
import { Document } from "../models/DocumentModel";
import { BlockNode } from "../models/BlockNodeModel";
import { protect, AuthenticatedRequest } from "../middleware/authMiddleware";

const router = Router();

// Create a new document
router.post("/", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title } = req.body;

    const doc = await Document.create({
      title: title || "Untitled Document",
      ownerId: req.userId,
      collaborators: [],
      rootNodeId: null,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("Create document error:", err);
    res.status(500).json({ message: "Something went wrong creating the document" });
  }
});

// List all documents owned by the current user
router.get("/", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const documents = await Document.find({ ownerId: req.userId });
    res.json(documents);
  } catch (err) {
    console.error("Fetch documents error:", err);
    res.status(500).json({ message: "Something went wrong fetching documents" });
  }
});

// Get a single document, along with all its block nodes
router.get("/:id", protect, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (doc.ownerId.toString() !== req.userId) {
      return res.status(403).json({ message: "You don't have access to this document" });
    }

    const blocks = await BlockNode.find({ documentId: doc._id }).sort({ order: 1 });

    res.json({ document: doc, blocks });
  } catch (err) {
    console.error("Fetch document error:", err);
    res.status(500).json({ message: "Something went wrong fetching the document" });
  }
});

export default router;