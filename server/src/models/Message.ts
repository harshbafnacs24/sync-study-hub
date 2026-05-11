import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", index: true },
    channelId: { type: Schema.Types.ObjectId, ref: "Channel", index: true },
    senderId: { type: String, required: true, index: true },
    text: { type: String, required: true, maxlength: 4000 },
    attachments: { type: [{ url: String, kind: String, name: String, size: Number }], default: [] },
    reactions: { type: Map, of: [String], default: {} }, // emoji -> userIds
    readBy: { type: [String], default: [] },
    system: { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ channelId: 1, createdAt: -1 });

export type MessageDoc = InferSchemaType<typeof messageSchema> & { _id: any; createdAt: Date; updatedAt: Date };
export const Message: Model<MessageDoc> = model<MessageDoc>("Message", messageSchema);
