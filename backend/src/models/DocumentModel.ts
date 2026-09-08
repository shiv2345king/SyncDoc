import { Schema, model, Types, Document as MongooseDocument } from "mongoose";

export interface ICollaborator {
  userId: Types.ObjectId;
  role: "owner" | "editor" | "viewer";
}

export interface IDocument extends MongooseDocument {
  title: string;
  ownerId: Types.ObjectId;
  collaborators: ICollaborator[];
  rootNodeId: Types.ObjectId | null;
}

const documentSchema = new Schema<IDocument>({
  title: { type: String, required: true, default: "Untitled Document" },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  collaborators: [{
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    role: { type: String, enum: ["owner", "editor", "viewer"], default: "editor" },
  }],
  rootNodeId: { type: Schema.Types.ObjectId, ref: "BlockNode", default: null },
}, { timestamps: true });

documentSchema.pre("save", async function () {
  if (!this.title || this.title.trim().length === 0) {
    throw new Error("Document title cannot be empty");
  }
});

export const Document = model<IDocument>("Document", documentSchema);