import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/validate.js";
import { StudySession } from "../../models/StudySession.js";
import { Task } from "../../models/Task.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get("/summary", asyncHandler(async (req: AuthedRequest, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [sessions, openTasks] = await Promise.all([
    StudySession.find({
      userId: req.userId,
      kind: "focus",
      state: "completed",
      endedAt: { $gte: sevenDaysAgo },
    }).lean(),
    Task.countDocuments({ userId: req.userId, status: { $ne: "done" } }),
  ]);

  const dayMap = new Map<string, number>();
  for (const s of sessions) {
    const day = (s.endedAt ?? s.startedAt as any)?.toISOString?.().slice(0, 10);
    if (!day) continue;
    dayMap.set(day, (dayMap.get(day) ?? 0) + Math.round((s.elapsedSeconds ?? 0) / 60));
  }

  const today = new Date().toISOString().slice(0, 10);
  const byDay: { date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    byDay.push({ date: k, minutes: dayMap.get(k) ?? 0 });
  }

  let streak = 0;
  for (let i = byDay.length - 1; i >= 0; i--) {
    if (byDay[i].minutes > 0) streak++;
    else break;
  }

  res.json({
    todayFocusMinutes: dayMap.get(today) ?? 0,
    weeklyFocusMinutes: byDay.reduce((a, b) => a + b.minutes, 0),
    weeklySessions: sessions.length,
    streakDays: streak,
    openTasks,
    byDay,
  });
}));
