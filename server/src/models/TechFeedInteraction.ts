import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const interactionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: "TechFeedItem", required: true, index: true },
    liked: { type: Boolean, default: false },
    bookmarked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

interactionSchema.index({ userId: 1, itemId: 1 }, { unique: true });

export type TechFeedInteractionDoc = InferSchemaType<typeof interactionSchema> & { _id: any };
export const TechFeedInteraction: Model<TechFeedInteractionDoc> = model<TechFeedInteractionDoc>("TechFeedInteraction", interactionSchema);
