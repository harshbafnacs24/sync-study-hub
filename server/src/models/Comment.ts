import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const commentSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    authorId: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true },
);

commentSchema.index({ postId: 1, createdAt: 1 });

export type CommentDoc = InferSchemaType<typeof commentSchema> & { _id: any; createdAt: Date; updatedAt: Date };
export const Comment: Model<CommentDoc> = model<CommentDoc>("Comment", commentSchema);
