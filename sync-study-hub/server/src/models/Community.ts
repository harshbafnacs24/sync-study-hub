import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const communitySchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, maxlength: 280, default: "" },
    category: { type: String, required: true, index: true },
    tags: { type: [String], default: [] },
    iconChar: { type: String, default: "•", maxlength: 4 },
    bannerUrl: { type: String, default: null },
    members: { type: Number, default: 1 },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    createdBy: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export type CommunityDoc = InferSchemaType<typeof communitySchema> & { _id: any; createdAt: Date };
export const Community: Model<CommunityDoc> = model<CommunityDoc>("Community", communitySchema);
