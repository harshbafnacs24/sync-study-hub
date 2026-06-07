import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const techFeedSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["hackathon", "internship", "job", "news", "competition", "scholarship"],
      index: true,
    },
    category: { type: String, required: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    url: { type: String, default: null },
    company: { type: String, default: null },
    location: { type: String, default: null },
    deadline: { type: Date, default: null },
    prizePool: { type: String, default: null },
    eligibility: { type: String, default: null },
    tags: { type: [String], default: [] },
    featured: { type: Boolean, default: false, index: true },
    source: { type: String, default: "Sync & Study" },
  },
  { timestamps: true },
);

techFeedSchema.index({ createdAt: -1 });
techFeedSchema.index({ type: 1, category: 1 });

export type TechFeedItemDoc = InferSchemaType<typeof techFeedSchema> & { _id: any; createdAt: Date; updatedAt: Date };
export const TechFeedItem: Model<TechFeedItemDoc> = model<TechFeedItemDoc>("TechFeedItem", techFeedSchema);
