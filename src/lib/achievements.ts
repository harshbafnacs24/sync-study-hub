export interface Achievement {
  id: string;
  label: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

export function computeAchievements(opts: {
  streakDays: number;
  weeklyFocusMinutes: number;
  sageTurns: number;
  friendCount: number;
  postsCount: number;
}): Achievement[] {
  return [
    { id: "top_learner", label: "Top Learner", icon: "🏆", description: "7-day study streak", unlocked: opts.streakDays >= 7 },
    { id: "community_helper", label: "Community Helper", icon: "🤝", description: "5+ friend connections", unlocked: opts.friendCount >= 5 },
    { id: "coding_enthusiast", label: "Coding Enthusiast", icon: "💻", description: "300+ focus minutes this week", unlocked: opts.weeklyFocusMinutes >= 300 },
    { id: "hackathon_participant", label: "Hackathon Participant", icon: "🚀", description: "Bookmarked a hackathon", unlocked: false },
    { id: "interview_master", label: "Interview Master", icon: "🎯", description: "20+ Sage learning sessions", unlocked: opts.sageTurns >= 20 },
    { id: "content_creator", label: "Content Creator", icon: "✍️", description: "Shared 3+ posts", unlocked: opts.postsCount >= 3 },
  ];
}

export function trackSageSession() {
  if (typeof window === "undefined") return;
  const count = Number(localStorage.getItem("ss.sage.sessions") ?? "0") + 1;
  localStorage.setItem("ss.sage.sessions", String(count));
}

export function getSageSessionCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem("ss.sage.sessions") ?? "0");
}

export function getDailyGoal(): { target: number; done: number } {
  if (typeof window === "undefined") return { target: 60, done: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem(`ss.daily.goal.${today}`);
  return raw ? JSON.parse(raw) : { target: 60, done: 0 };
}

export function updateDailyGoal(minutes: number) {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const current = getDailyGoal();
  localStorage.setItem(`ss.daily.goal.${today}`, JSON.stringify({ ...current, done: Math.min(current.target, minutes) }));
}
