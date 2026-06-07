import type { AiMessage } from "./provider.js";
import { Task } from "../models/Task.js";
import { StudySession } from "../models/StudySession.js";
import { Profile } from "../models/Profile.js";
import { buildSageSystemPrompt } from "./sage-modes.js";
import type { SageDifficulty, SageLearningMode } from "./sage-modes.js";

export async function buildContext(
  userId: string,
  opts?: {
    extra?: string;
    mode?: SageLearningMode;
    difficulty?: SageDifficulty;
    tool?: string;
  },
): Promise<AiMessage> {
  const [profile, tasks, sessions] = await Promise.all([
    Profile.findOne({ userId }).select("name subjects goals school branch").lean(),
    Task.find({ userId, status: { $ne: "done" } })
      .sort({ createdAt: -1 }).limit(5)
      .select("title priority subject").lean(),
    StudySession.find({ userId, state: "completed" })
      .sort({ createdAt: -1 }).limit(5)
      .select("elapsedSeconds").lean(),
  ]);

  const studyMinutes = (sessions as any[]).reduce((n, s) => n + Math.round((s.elapsedSeconds ?? 0) / 60), 0);
  const p = profile as any;

  return buildSageSystemPrompt({
    name: p?.name ?? "Student",
    subjects: p?.subjects ?? [],
    branch: p?.branch,
    school: p?.school,
    goals: p?.goals,
    openTasks: (tasks as any[]).map((t) => t.title.slice(0, 50)),
    studyMinutes,
    mode: opts?.mode ?? "general",
    difficulty: opts?.difficulty ?? "intermediate",
    tool: opts?.tool,
    extra: opts?.extra,
  });
}

/** @deprecated use buildContext with opts */
export async function buildContextLegacy(userId: string, extra?: string): Promise<AiMessage> {
  return buildContext(userId, { extra });
}
