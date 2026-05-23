import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { StudySession } from "../../models/StudySession.js";

export const sessionsRouter = Router();

const createSchema = z.object({
  kind: z.enum(["focus", "short_break", "long_break"]),
  plannedSeconds: z.number().min(60).max(60 * 60 * 4),
  elapsedSeconds: z.number().min(0).max(60 * 60 * 4),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable().optional(),
  state: z.enum(["running", "paused", "completed", "cancelled"]).default("completed"),
  subject: z.string().max(60).nullable().optional(),
  taskId: z.string().optional(),
});

function serialize(s: any) {
  return {
    id: String(s._id),
    kind: s.kind,
    plannedSeconds: s.plannedSeconds,
    elapsedSeconds: s.elapsedSeconds,
    startedAt: s.startedAt?.toISOString?.(),
    endedAt: s.endedAt?.toISOString?.() ?? null,
    state: s.state,
    subject: s.subject,
    taskId: s.taskId ? String(s.taskId) : null,
  };
}

sessionsRouter.use(requireAuth);

sessionsRouter.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const items = await StudySession.find({ userId: req.userId }).sort({ endedAt: -1 }).limit(100);
  res.json({ sessions: items.map(serialize) });
}));

sessionsRouter.post("/", validate(createSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const s = await StudySession.create({ ...req.body, userId: req.userId });
  res.status(201).json({ session: serialize(s) });
}));
