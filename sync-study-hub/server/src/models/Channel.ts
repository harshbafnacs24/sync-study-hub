import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const channelSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    name: { type: String, required: true, maxlength: 32 },
    topic: { type: String, maxlength: 200, default: "" },
    pinned: { type: Boolean, default: false },
    moderatorsOnly: { type: Boolean, default: false },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

channelSchema.index({ communityId: 1, name: 1 }, { unique: true });

export type ChannelDoc = InferSchemaType<typeof channelSchema> & { _id: any; createdAt: Date };
export const Channel: Model<ChannelDoc> = model<ChannelDoc>("Channel", channelSchema);
