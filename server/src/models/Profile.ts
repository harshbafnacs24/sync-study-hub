import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const profileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    publicId: { type: String, unique: true, sparse: true, index: true },
    avatar: { type: String, default: null },
    bio: { type: String, default: null },
    school: { type: String, default: null },
    branch: { type: String, default: null },
    year: { type: String, default: null },
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"], default: null },
    subjects: { type: [String], default: [] },
    goals: { type: String, default: null },
    timezone: { type: String, default: null },
    profileCompleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export type ProfileDoc = InferSchemaType<typeof profileSchema> & { _id: any };
export const Profile: Model<ProfileDoc> = model<ProfileDoc>("Profile", profileSchema);
