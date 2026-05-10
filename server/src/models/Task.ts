import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const taskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    notes: { type: String, default: null, maxlength: 2000 },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo", index: true },
    dueDate: { type: String, default: null }, // YYYY-MM-DD
    subject: { type: String, default: null, maxlength: 60 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type TaskDoc = InferSchemaType<typeof taskSchema> & { _id: any };
export const Task: Model<TaskDoc> = model<TaskDoc>("Task", taskSchema);
