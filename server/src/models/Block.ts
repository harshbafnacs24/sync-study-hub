import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const blockSchema = new Schema(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    blockedId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export type BlockDoc = InferSchemaType<typeof blockSchema> & { _id: any; createdAt: Date };
export const Block: Model<BlockDoc> = model<BlockDoc>("Block", blockSchema);
