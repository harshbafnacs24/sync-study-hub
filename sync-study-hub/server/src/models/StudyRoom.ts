import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const participantSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const studyRoomSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 80, trim: true },
    subject: { type: String, default: null, maxlength: 60, trim: true },
    hostId: { type: String, required: true, index: true },
    hostName: { type: String, required: true },
    inviteCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    meetLink: { type: String, default: null, maxlength: 2048 },
    meetProvider: {
      type: String,
      enum: ["meet", "zoom", "teams", "other"],
      default: null,
    },
    plannedMinutes: { type: Number, default: 60, min: 5, max: 480 },
    participants: { type: [participantSchema], default: [] },
    status: { type: String, enum: ["active", "ended"], default: "active", index: true },
  },
  { timestamps: true },
);

studyRoomSchema.index({ status: 1, createdAt: -1 });

export type StudyRoomDoc = InferSchemaType<typeof studyRoomSchema> & { _id: any; createdAt: Date };
export const StudyRoom: Model<StudyRoomDoc> = model<StudyRoomDoc>("StudyRoom", studyRoomSchema);
