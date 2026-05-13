/**
 * Builds the SageContext payload sent with every Sage request.
 * Reads from the local stores so the AI is grounded in the user's real state.
 *
 * Cross-platform: only touches storage helpers (which are SSR-safe).
 */
import { tasksStore } from "../store/tasks";
import { sessionsStore, computeAnalytics } from "../store/sessions";
import { communitiesStore } from "../store/communities";
import { storage } from "../store/storage";
import type { Profile } from "../types";

export interface SageContext {
  profile?: Pick<Profile, "name" | "subjects" | "goals" | "year"> | null;
  openTasks: { title: string; priority: string; subject?: string | null; dueDate?: string | null }[];
  todayFocusMinutes: number;
  weeklyFocusMinutes: number;
  streakDays: number;
  recentSubjects: string[];
  joinedCommunities: string[];
}

export function buildSageContext(): SageContext {
  const profile = storage.get<Profile | null>("profile", null);
  const openTasks = tasksStore.list()
    .filter((t) => t.status !== "done")
    .slice(0, 20)
    .map((t) => ({
      title: t.title,
      priority: t.priority,
      subject: t.subject ?? null,
      dueDate: t.dueDate ?? null,
    }));

  const analytics = computeAnalytics();

  const recentSubjects = Array.from(
    new Set(
      sessionsStore.list()
        .filter((s) => s.kind === "focus" && s.state === "completed" && s.subject)
        .slice(0, 10)
        .map((s) => s.subject as string),
    ),
  );

  const joinedCommunities = communitiesStore.list().filter((c) => c.joined).map((c) => c.name);

  return {
    profile: profile
      ? { name: profile.name, subjects: profile.subjects, goals: profile.goals, year: profile.year }
      : null,
    openTasks,
    todayFocusMinutes: analytics.todayFocusMinutes,
    weeklyFocusMinutes: analytics.weeklyFocusMinutes,
    streakDays: analytics.streakDays,
    recentSubjects,
    joinedCommunities,
  };
}
