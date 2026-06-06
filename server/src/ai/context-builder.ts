import type { AiMessage } from "./provider.js";
import { Task } from "../models/Task.js";
import { StudySession } from "../models/StudySession.js";
import { Profile } from "../models/Profile.js";

/**
 * Lean system prompt — keeps token count low to preserve free-tier quota.
 * Max ~300 tokens of context per request.
 */
export async function buildContext(userId: string, extra?: string): Promise<AiMessage> {
  const [profile, tasks, sessions] = await Promise.all([
    Profile.findOne({ userId }).select("name subjects goals").lean(),
    Task.find({ userId, status: { $ne: "done" } })
      .sort({ createdAt: -1 }).limit(5)
      .select("title priority dueDate subject").lean(),
    StudySession.find({ userId, state: "completed" })
      .sort({ createdAt: -1 }).limit(5)
      .select("plannedSeconds elapsedSeconds subject").lean(),
  ]);

  const totalMin = sessions.reduce((n, s: any) => {
    return n + Math.round((s.elapsedSeconds ?? 0) / 60);
  }, 0);

  const p = profile as any;
  const lines: string[] = [
    "You are Sage, a concise study coach in Sync & Study.",
    "Be brief, use bullet points, give concrete next steps. Max 3 paragraphs.",
    "",
    `User: ${p?.name ?? "Student"}`,
    p?.subjects?.length ? `Subjects: ${p.subjects.slice(0, 4).join(", ")}` : "",
    p?.goals ? `Goal: ${p.goals.slice(0, 80)}` : "",
    "",
    `Open tasks (${tasks.length}):`,
    ...(tasks as any[]).map(t =>
      `- [${t.priority}] ${t.title.slice(0, 50)}${t.subject ? ` · ${t.subject}` : ""}`
    ),
    "",
    `Recent study: ${sessions.length} sessions, ${totalMin} min total.`,
    extra ? `\nContext: ${extra.slice(0, 200)}` : "",
  ].filter(Boolean);

  return { role: "system", content: lines.join("\n") };
}
