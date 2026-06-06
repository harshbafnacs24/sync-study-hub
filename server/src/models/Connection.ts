import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const connectionSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending", index: true },
  },
  { timestamps: true }
);

connectionSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

export type ConnectionDoc = InferSchemaType<typeof connectionSchema> & { _id: any; createdAt: Date; updatedAt: Date };
export const Connection: Model<ConnectionDoc> = model<ConnectionDoc>("Connection", connectionSchema);
