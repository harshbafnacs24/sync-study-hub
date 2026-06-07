import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const postSchema = new Schema(
  {
    authorId: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 2000 },
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, enum: ["image", "gif", null], default: null },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

postSchema.index({ createdAt: -1 });

export type PostDoc = InferSchemaType<typeof postSchema> & { _id: any; createdAt: Date; updatedAt: Date };
export const Post: Model<PostDoc> = model<PostDoc>("Post", postSchema);
