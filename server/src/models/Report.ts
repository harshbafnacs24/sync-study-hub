import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const reportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
    category: { type: String, enum: ["spam", "harassment", "inappropriate", "other"], required: true },
    reason: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export type ReportDoc = InferSchemaType<typeof reportSchema> & { _id: any; createdAt: Date };
export const Report: Model<ReportDoc> = model<ReportDoc>("Report", reportSchema);
