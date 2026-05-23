import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    kind: { type: String, required: true }, // dm | mention | community_invite | channel_message | session_reminder | task_due
    title: { type: String, required: true },
    body: { type: String, default: "" },
    href: { type: String, default: null },
    read: { type: Boolean, default: false, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema> & { _id: any; createdAt: Date };
export const Notification: Model<NotificationDoc> = model<NotificationDoc>("Notification", notificationSchema);
