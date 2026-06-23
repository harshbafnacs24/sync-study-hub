import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const conversationSchema = new Schema(
  {
    participants: { type: [String], required: true, index: true },
    pinnedBy: { type: [String], default: [] },
    isGroup: { type: Boolean, default: false, index: true },
    groupName: { type: String, default: "" },
    groupAvatar: { type: String, default: "" },
    createdBy: { type: String, default: null },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastPreview: { type: String, default: "" },
    unread: { type: Map, of: Number, default: {} }, // userId -> count
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export type ConversationDoc = InferSchemaType<typeof conversationSchema> & { _id: any; createdAt: Date; updatedAt: Date };
export const Conversation: Model<ConversationDoc> = model<ConversationDoc>("Conversation", conversationSchema);
