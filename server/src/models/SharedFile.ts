import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const sharedFileSchema = new Schema(
  {
    uploaderId: { type: String, required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null, index: true },
    messageId: { type: Schema.Types.ObjectId, ref: "Message", default: null, index: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    kind: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type SharedFileDoc = InferSchemaType<typeof sharedFileSchema> & { _id: any; createdAt: Date };
export const SharedFile: Model<SharedFileDoc> = model<SharedFileDoc>("SharedFile", sharedFileSchema);
