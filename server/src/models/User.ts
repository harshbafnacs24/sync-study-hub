import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String },
    googleId: { type: String, index: true, sparse: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: any; createdAt: Date };
export const User: Model<UserDoc> = model<UserDoc>("User", userSchema);
