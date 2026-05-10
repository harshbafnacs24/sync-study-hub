import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { Task } from "../../models/Task.js";

export const tasksRouter = Router();

const createSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  subject: z.string().max(60).nullable().optional(),
});

const patchSchema = createSchema.partial();

const listQuery = z.object({
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

function serialize(t: any) {
  return {
    id: String(t._id),
    title: t.title,
    notes: t.notes,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    subject: t.subject,
    completedAt: t.completedAt?.toISOString?.() ?? null,
    createdAt: t.createdAt?.toISOString?.(),
  };
}

tasksRouter.use(requireAuth);

tasksRouter.get("/", validate(listQuery, "query"), asyncHandler(async (req: AuthedRequest, res) => {
  const { status, limit } = req.query as any;
  const filter: any = { userId: req.userId };
  if (status) filter.status = status;
  const items = await Task.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json({ tasks: items.map(serialize) });
}));

tasksRouter.post("/", validate(createSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const t = await Task.create({ ...req.body, userId: req.userId });
  res.status(201).json({ task: serialize(t) });
}));

tasksRouter.patch("/:id", validate(patchSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const patch: any = { ...req.body };
  if (patch.status === "done") patch.completedAt = new Date();
  if (patch.status && patch.status !== "done") patch.completedAt = null;
  const t = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { $set: patch }, { new: true });
  if (!t) return res.status(404).json({ error: "Task not found" });
  res.json({ task: serialize(t) });
}));

tasksRouter.delete("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const r = await Task.deleteOne({ _id: req.params.id, userId: req.userId });
  if (r.deletedCount === 0) return res.status(404).json({ error: "Task not found" });
  res.status(204).end();
}));
