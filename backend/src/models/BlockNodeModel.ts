import { Schema, model, Types, Document as MongooseDocument, HydratedDocument } from "mongoose";

export type BlockType = "heading" | "paragraph" | "codeBlock" | "list" | "listItem";

export interface IBlockNode extends MongooseDocument {
  documentId: Types.ObjectId;
  type: BlockType;
  content: string;
  parentId: Types.ObjectId | null;
  order: number;
  children: Types.ObjectId[];
}

const blockNodeSchema = new Schema<IBlockNode>({
  documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
  type: {
    type: String,
    required: true,
    enum: ["heading", "paragraph", "codeBlock", "list", "listItem"],
  },
  content: { type: String, default: "" },
  parentId: { type: Schema.Types.ObjectId, ref: "BlockNode", default: null },
  order: { type: Number, required: true },
  children: [{ type: Schema.Types.ObjectId, ref: "BlockNode" }],
}, { timestamps: true });

const ALLOWED_PARENTS: Record<BlockType, BlockType[]> = {
  heading: [],
  paragraph: [],
  codeBlock: [],
  list: [],
  listItem: ["list"],
};

blockNodeSchema.pre("save", async function () {
  if (this.parentId) {
    const parent = await BlockNode.findById(this.parentId);

    if (!parent) {
      throw new Error(`Parent node ${this.parentId.toString()} does not exist`);
    }

    const allowedParents = ALLOWED_PARENTS[this.type];
    if (allowedParents.length > 0 && !allowedParents.includes(parent.type)) {
      throw new Error(`Block type '${this.type}' cannot be a child of '${parent.type}'`);
    }

    const visited = new Set<string>([this._id.toString()]);
    let current: HydratedDocument<IBlockNode> | null = parent;

    while (current?.parentId) {
      const currentIdStr = current._id.toString();
      if (visited.has(currentIdStr)) {
        throw new Error("Circular reference detected in block tree");
      }
      visited.add(currentIdStr);
      current = await BlockNode.findById(current.parentId);
    }
  }
});

export const BlockNode = model<IBlockNode>("BlockNode", blockNodeSchema);