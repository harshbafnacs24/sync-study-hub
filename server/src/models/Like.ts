import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const likeSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    userId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

likeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export type LikeDoc = InferSchemaType<typeof likeSchema> & { _id: any; createdAt: Date };
export const Like: Model<LikeDoc> = model<LikeDoc>("Like", likeSchema);
