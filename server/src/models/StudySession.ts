import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["focus", "short_break", "long_break"], required: true },
    plannedSeconds: { type: Number, required: true, min: 60 * 5, max: 60 * 60 * 8 },
    elapsedSeconds: { type: Number, required: true, min: 0 },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    state: { type: String, enum: ["running", "paused", "completed", "cancelled"], default: "completed" },
    subject: { type: String, default: null, maxlength: 60 },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", default: null, index: true },
    taskGoal: { type: String, default: null, maxlength: 200 },
    estimatedMinutes: { type: Number, default: null },
    completionStatus: { type: String, enum: ["completed", "partial", "not_completed", null], default: null },
    completionPercent: { type: Number, default: null, min: 0, max: 100 },
    achievement: { type: String, default: null, maxlength: 500 },
    incompleteReason: { type: String, enum: ["distracted", "too_difficult", "lack_of_time", "other", null], default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ userId: 1, endedAt: -1 });

export type StudySessionDoc = InferSchemaType<typeof sessionSchema> & { _id: any };
export const StudySession: Model<StudySessionDoc> = model<StudySessionDoc>("StudySession", sessionSchema);
