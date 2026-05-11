import type { AiMessage } from "./provider.js";
import { Task } from "../models/Task.js";
import { StudySession } from "../models/StudySession.js";
import { Profile } from "../models/Profile.js";

/**
 * Builds a grounded system prompt for Sage from the user's profile, open tasks,
 * and recent focus history. Keeps the prompt small (model context budget).
 */
export async function buildContext(userId: string, extra?: string): Promise<AiMessage> {
  const [profile, tasks, sessions] = await Promise.all([
    Profile.findOne({ userId }).lean(),
    Task.find({ userId, status: { $ne: "done" } }).sort({ createdAt: -1 }).limit(8).lean(),
    StudySession.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const totalMin = sessions.reduce((n, s: any) => n + (s.durationMin ?? 0), 0);

  const lines = [
    "You are Sage, a focused study companion inside Sync & Study.",
    "Be concise, structured, and accountable. Prefer bullet plans, time blocks, and concrete next steps.",
    "Never invent user data — if context is missing, say so and ask one clarifying question.",
    "",
    "## User context",
    profile?.name ? `Name: ${profile.name}` : "",
    profile?.subjects?.length ? `Subjects: ${profile.subjects.join(", ")}` : "",
    profile?.goals ? `Goals: ${profile.goals}` : "",
    `Open tasks (${tasks.length}):`,
    ...tasks.map((t: any) => `  - [${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`),
    `Recent focus: ${sessions.length} sessions, ${totalMin} min total.`,
    extra ? `\nAdditional context:\n${extra}` : "",
  ].filter(Boolean);

  return { role: "system", content: lines.join("\n") };
}
