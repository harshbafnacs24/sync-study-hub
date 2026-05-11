import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const memberSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["owner", "admin", "moderator", "member"], default: "member" },
    mutedChannels: { type: [String], default: [] },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

memberSchema.index({ communityId: 1, userId: 1 }, { unique: true });

export type CommunityMemberDoc = InferSchemaType<typeof memberSchema> & { _id: any };
export const CommunityMember: Model<CommunityMemberDoc> = model<CommunityMemberDoc>("CommunityMember", memberSchema);
