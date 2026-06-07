import { storage, newId, todayISO } from "./storage";
import { api } from "../api-client";

export type SessionKind = "focus" | "short_break" | "long_break";
export type SessionState = "running" | "paused" | "completed" | "cancelled";
export type CompletionStatus = "completed" | "partial" | "not_completed" | null;
export type IncompleteReason = "distracted" | "too_difficult" | "lack_of_time" | "other" | null;

export interface FocusSession {
  id: string;
  kind: SessionKind;
  plannedSeconds: number;
  elapsedSeconds: number;
  startedAt: string;
  endedAt?: string | null;
  state: SessionState;
  subject?: string | null;
  taskId?: string | null;
  taskGoal?: string | null;
  estimatedMinutes?: number | null;
  completionStatus?: CompletionStatus;
  completionPercent?: number | null;
  achievement?: string | null;
  incompleteReason?: IncompleteReason;
  checkpointsPassed?: number[];
  sharedWithFriends?: boolean;
}

export interface SessionLog extends FocusSession {
  completedAt: string;
}

const KEY = "sessions";
const ACTIVE_KEY = "active_session";
const LOG_KEY = "session_logs";
const PLANNED_KEY = "planned_study_goals";

export const sessionsStore = {
  list(): FocusSession[] {
    const raw = storage.get<FocusSession[] | null>(KEY, []);
    return Array.isArray(raw) ? raw : [];
  },
  logs(): SessionLog[] {
    const raw = storage.get<SessionLog[] | null>(LOG_KEY, []);
    return Array.isArray(raw) ? raw : [];
  },
  active(): FocusSession | null {
    return storage.get<FocusSession | null>(ACTIVE_KEY, null);
  },
  setActive(s: FocusSession | null) {
    if (s) storage.set(ACTIVE_KEY, s);
    else storage.remove(ACTIVE_KEY);
  },
  start(input: {
    kind: SessionKind;
    plannedSeconds: number;
    subject?: string | null;
    taskId?: string | null;
    taskGoal?: string | null;
    estimatedMinutes?: number | null;
    sharedWithFriends?: boolean;
  }): FocusSession {
    const s: FocusSession = {
      id: newId(),
      kind: input.kind,
      plannedSeconds: input.plannedSeconds,
      elapsedSeconds: 0,
      startedAt: new Date().toISOString(),
      endedAt: null,
      state: "running",
      subject: input.subject ?? null,
      taskId: input.taskId ?? null,
      taskGoal: input.taskGoal ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      checkpointsPassed: [],
      sharedWithFriends: input.sharedWithFriends ?? false,
    };
    sessionsStore.setActive(s);
    return s;
  },
  updateActive(patch: Partial<FocusSession>) {
    const current = sessionsStore.active();
    if (!current) return null;
    const updated = { ...current, ...patch };
    sessionsStore.setActive(updated);
    return updated;
  },
  finalize(session: FocusSession, state: Extract<SessionState, "completed" | "cancelled">, extra?: Partial<FocusSession>) {
    const final: FocusSession = {
      ...session,
      ...extra,
      state,
      endedAt: new Date().toISOString(),
    };
    storage.set(KEY, [final, ...sessionsStore.list()]);
    const log: SessionLog = { ...final, completedAt: final.endedAt! };
    storage.set(LOG_KEY, [log, ...sessionsStore.logs()].slice(0, 200));
    sessionsStore.setActive(null);

    if (final.kind === "focus" && state === "completed") {
      sessionsStore.syncToServer(final).catch(() => {});
    }
    return final;
  },
  async syncToServer(session: FocusSession) {
    await api.request("/api/v1/sessions", {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        kind: session.kind,
        plannedSeconds: session.plannedSeconds,
        elapsedSeconds: session.elapsedSeconds,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        state: session.state,
        subject: session.subject,
        taskGoal: session.taskGoal,
        estimatedMinutes: session.estimatedMinutes,
        completionStatus: session.completionStatus,
        completionPercent: session.completionPercent,
        achievement: session.achievement,
        incompleteReason: session.incompleteReason,
      }),
    });
  },
  setPlannedGoal(goal: { title: string; subject: string; plannedAt: string }) {
    const goals = storage.get<any[]>(PLANNED_KEY, []);
    storage.set(PLANNED_KEY, [goal, ...goals.filter((g) => g.title !== goal.title)].slice(0, 10));
  },
  getPlannedGoals(): { title: string; subject: string; plannedAt: string; reminded?: boolean }[] {
    return storage.get(PLANNED_KEY, []);
  },
  markGoalReminded(title: string) {
    const goals = sessionsStore.getPlannedGoals().map((g) =>
      g.title === title ? { ...g, reminded: true } : g,
    );
    storage.set(PLANNED_KEY, goals);
  },
  updateLog(id: string, patch: Partial<SessionLog>) {
    const logs = sessionsStore.logs();
    const idx = logs.findIndex((l) => l.id === id);
    if (idx === -1) return;
    logs[idx] = { ...logs[idx], ...patch };
    storage.set(LOG_KEY, logs);
    const sessions = sessionsStore.list();
    const sIdx = sessions.findIndex((s) => s.id === id);
    if (sIdx !== -1) {
      sessions[sIdx] = { ...sessions[sIdx], ...patch };
      storage.set(KEY, sessions);
    }
  },
};

export interface AnalyticsSummary {
  todayFocusMinutes: number;
  todaySessions: number;
  weeklyFocusMinutes: number;
  weeklySessions: number;
  monthlyFocusMinutes: number;
  monthlySessions: number;
  totalHours: number;
  streakDays: number;
  weeklyStreak: number;
  completionRate: number;
  avgSessionMinutes: number;
  byDay: { date: string; minutes: number }[];
  bySubject: { subject: string; minutes: number }[];
}

export function computeAnalytics(): AnalyticsSummary {
  const logs = sessionsStore.logs().filter((s) => s.kind === "focus" && s.state === "completed");
  const today = todayISO();
  const dayMap = new Map<string, number>();
  const subjectMap = new Map<string, number>();

  for (const s of logs) {
    const day = (s.endedAt ?? s.startedAt).slice(0, 10);
    const mins = Math.round(s.elapsedSeconds / 60);
    dayMap.set(day, (dayMap.get(day) ?? 0) + mins);
    const subj = s.subject || "General";
    subjectMap.set(subj, (subjectMap.get(subj) ?? 0) + mins);
  }

  const last7: { date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last7.push({ date: key, minutes: dayMap.get(key) ?? 0 });
  }

  const todayFocusMinutes = dayMap.get(today) ?? 0;
  const todaySessions = logs.filter((s) => (s.endedAt ?? "").startsWith(today)).length;
  const weeklyFocusMinutes = last7.reduce((a, b) => a + b.minutes, 0);
  const weeklySessions = logs.filter((s) => last7.some((d) => d.date === (s.endedAt ?? "").slice(0, 10))).length;

  const monthStart = today.slice(0, 7);
  const monthlyLogs = logs.filter((s) => (s.endedAt ?? s.startedAt).startsWith(monthStart));
  const monthlyFocusMinutes = monthlyLogs.reduce((n, s) => n + Math.round(s.elapsedSeconds / 60), 0);

  const totalMinutes = logs.reduce((n, s) => n + Math.round(s.elapsedSeconds / 60), 0);
  const completed = logs.filter((s) => s.completionStatus === "completed").length;
  const rated = logs.filter((s) => s.completionStatus).length;
  const completionRate = rated > 0 ? Math.round((completed / rated) * 100) : 0;
  const avgSessionMinutes = logs.length > 0 ? Math.round(totalMinutes / logs.length) : 0;

  let streak = 0;
  for (let i = last7.length - 1; i >= 0; i--) {
    if (last7[i].minutes > 0) streak++;
    else break;
  }

  let weeklyStreak = 0;
  for (let w = 0; w < 4; w++) {
    const weekMins = logs
      .filter((s) => {
        const d = new Date(s.endedAt ?? s.startedAt);
        const now = new Date();
        const diff = Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 3600 * 1000));
        return diff === w;
      })
      .reduce((n, s) => n + Math.round(s.elapsedSeconds / 60), 0);
    if (weekMins >= 60) weeklyStreak++;
    else break;
  }

  const bySubject = [...subjectMap.entries()]
    .map(([subject, minutes]) => ({ subject, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8);

  return {
    todayFocusMinutes,
    todaySessions,
    weeklyFocusMinutes,
    weeklySessions,
    monthlyFocusMinutes,
    monthlySessions: monthlyLogs.length,
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    streakDays: streak,
    weeklyStreak,
    completionRate,
    avgSessionMinutes,
    byDay: last7,
    bySubject,
  };
}

export const STREAK_BADGES = [
  { id: "streak_3", label: "3 Day Streak", icon: "🔥", days: 3 },
  { id: "streak_7", label: "7 Day Streak", icon: "⚡", days: 7 },
  { id: "streak_30", label: "30 Day Streak", icon: "🌟", days: 30 },
  { id: "hours_100", label: "100 Hours Studied", icon: "📚", hours: 100 },
  { id: "focus_champion", label: "Focus Champion", icon: "🏅", sessions: 50 },
];

export function computeStreakBadges(analytics: AnalyticsSummary, totalSessions: number) {
  return STREAK_BADGES.map((b) => ({
    ...b,
    unlocked:
      ("days" in b && analytics.streakDays >= b.days) ||
      ("hours" in b && analytics.totalHours >= b.hours) ||
      ("sessions" in b && totalSessions >= b.sessions),
  }));
}
