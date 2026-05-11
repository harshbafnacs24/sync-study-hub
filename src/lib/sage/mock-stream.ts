/**
 * Mock streaming provider for Sage. Yields tokens with realistic timing.
 * Replaced by real Gemini provider in `server/src/ai/providers/gemini.ts`
 * when GEMINI_API_KEY is set. Frontend contract stays identical.
 */

const TEMPLATES: Record<string, string> = {
  plan: `Here's a focused plan for the next 4 hours, grounded in your open tasks and recent focus history.

**Block 1 — 18:00 to 19:30** · Deep work
Tackle your highest-priority DSA task. Two 45-min focus blocks with a 10-min walk in between.

**Block 2 — 19:40 to 20:30** · Review
Skim today's notes, mark anything weak, and queue 3 spaced-repetition cards.

**Block 3 — 20:40 to 21:30** · Light work
Reply to messages in #daily-progress and update tomorrow's task list.

Want me to start a focus session for Block 1 now?`,

  quiz: `Quick check on the topic you focused on most this week. Answer in your head, then I'll grade.

1. What is the time complexity of building a heap from an unsorted array, and why isn't it O(n log n)?
2. Difference between BFS and Dijkstra when all edge weights are equal?
3. When does memoization stop helping a recursive solution?

Reply with answers and I'll give targeted feedback.`,

  summary: `**Yesterday's recap**

You logged **2h 45m** of focused work across 3 sessions. Streak: **14 days**.

- Closed 4 tasks (2 high priority).
- Strongest subject: **DSA** — 1h 50m.
- Channel activity: 6 posts in #daily-progress.

One flag: you skipped your evening review block. Want me to schedule it for tonight?`,

  default: `I can help with planning, quick recall quizzes, summaries, and accountability nudges. I see your tasks, focus history, streak, and the communities you're active in. What would help right now?`,
};

function pick(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("plan") || p.includes("schedule") || p.includes("day")) return TEMPLATES.plan;
  if (p.includes("quiz") || p.includes("test me") || p.includes("recall")) return TEMPLATES.quiz;
  if (p.includes("summar") || p.includes("recap") || p.includes("yesterday") || p.includes("week")) return TEMPLATES.summary;
  return TEMPLATES.default;
}

export interface SageStreamHandle {
  cancel: () => void;
  done: Promise<void>;
}

export function streamSageReply(
  prompt: string,
  onToken: (text: string) => void,
): SageStreamHandle {
  const full = pick(prompt);
  const tokens = full.split(/(\s+)/);
  let i = 0;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const done = new Promise<void>((resolve) => {
    const tick = () => {
      if (cancelled) return resolve();
      if (i >= tokens.length) return resolve();
      onToken(tokens[i] ?? "");
      i += 1;
      const ms = tokens[i - 1]?.match(/\n/) ? 90 : 18 + Math.random() * 30;
      timer = setTimeout(tick, ms);
    };
    tick();
  });

  return {
    cancel() { cancelled = true; if (timer) clearTimeout(timer); },
    done,
  };
}
