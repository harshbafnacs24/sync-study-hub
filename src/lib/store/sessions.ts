import { storage, newId, todayISO } from "./storage";

export type SessionKind = "focus" | "short_break" | "long_break";
export type SessionState = "running" | "paused" | "completed" | "cancelled";

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
}

const KEY = "sessions";
const ACTIVE_KEY = "active_session";

export const sessionsStore = {
  list(): FocusSession[] {
    return storage.get<FocusSession[]>(KEY, []);
  },
  active(): FocusSession | null {
    return storage.get<FocusSession | null>(ACTIVE_KEY, null);
  },
  setActive(s: FocusSession | null) {
    if (s) storage.set(ACTIVE_KEY, s);
    else storage.remove(ACTIVE_KEY);
  },
  start(input: { kind: SessionKind; plannedSeconds: number; subject?: string | null; taskId?: string | null }): FocusSession {
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
    };
    sessionsStore.setActive(s);
    return s;
  },
  finalize(session: FocusSession, state: Extract<SessionState, "completed" | "cancelled">) {
    const final: FocusSession = {
      ...session,
      state,
      endedAt: new Date().toISOString(),
    };
    storage.set(KEY, [final, ...sessionsStore.list()]);
    sessionsStore.setActive(null);
    return final;
  },
};

export interface AnalyticsSummary {
  todayFocusMinutes: number;
  todaySessions: number;
  weeklyFocusMinutes: number;
  weeklySessions: number;
  streakDays: number;
  byDay: { date: string; minutes: number }[]; // last 7 days
}

export function computeAnalytics(): AnalyticsSummary {
  const sessions = sessionsStore.list().filter((s) => s.kind === "focus" && s.state === "completed");
  const today = todayISO();
  const dayMap = new Map<string, number>();
  for (const s of sessions) {
    const day = (s.endedAt ?? s.startedAt).slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + Math.round(s.elapsedSeconds / 60));
  }
  const last7: { date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last7.push({ date: key, minutes: dayMap.get(key) ?? 0 });
  }
  const todayFocusMinutes = dayMap.get(today) ?? 0;
  const todaySessions = sessions.filter((s) => (s.endedAt ?? "").startsWith(today)).length;
  const weeklyFocusMinutes = last7.reduce((a, b) => a + b.minutes, 0);
  const weeklySessions = sessions.filter((s) => last7.some((d) => d.date === (s.endedAt ?? "").slice(0, 10))).length;

  // Streak: consecutive days ending today with > 0 minutes
  let streak = 0;
  for (let i = last7.length - 1; i >= 0; i--) {
    if (last7[i].minutes > 0) streak++;
    else break;
  }

  return { todayFocusMinutes, todaySessions, weeklyFocusMinutes, weeklySessions, streakDays: streak, byDay: last7 };
}
