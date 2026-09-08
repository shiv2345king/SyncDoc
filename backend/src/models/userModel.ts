import { Schema, model, Types, Document as MongooseDocument } from "mongoose";

interface IOAuthProvider {
  provider: "google" | "github";
  providerId: string;
}

export interface IUser extends MongooseDocument {
  email: string;
  name: string;
  passwordHashed?: string;
  avatarUrl?: string;
  oAuthProviders: IOAuthProvider[];
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHashed: { type: String, required: false },
  avatarUrl: { type: String, required: false },
  oAuthProviders: [{
    provider: { type: String, enum: ["google", "github"], required: true },
    providerId: { type: String, required: true },
  }],
}, { timestamps: true });

export const UserModel = model<IUser>("User", userSchema);