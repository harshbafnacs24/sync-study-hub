import type { Peer, Community, Channel } from "../types";

export const SEED_PEERS: Peer[] = [
  { id: "p_aanya", name: "Aanya Mehta", handle: "aanya", initials: "AM", online: true,  subject: "DSA" },
  { id: "p_kabir", name: "Kabir Singh", handle: "kabir", initials: "KS", online: true,  subject: "Web Dev" },
  { id: "p_riya",  name: "Riya Sharma", handle: "riya",  initials: "RS", online: false, subject: "AI/ML" },
  { id: "p_arjun", name: "Arjun Verma", handle: "arjun", initials: "AV", online: true,  subject: "DBMS" },
  { id: "p_meera", name: "Meera Iyer",  handle: "meera", initials: "MI", online: false, subject: "OS" },
];

export const SEED_COMMUNITIES: Community[] = [
  {
    id: "c_dsa", slug: "dsa-prep", name: "DSA Prep", iconChar: "λ",
    description: "Daily DSA grind. Pattern-based learning, contest debriefs, mock interviews.",
    category: "Interview Prep", tags: ["DSA", "LeetCode", "Interviews"],
    members: 12480, joined: true, trending: true, recommended: true,
  },
  {
    id: "c_web", slug: "web-dev", name: "Web Dev Builders", iconChar: "</>",
    description: "Ship real projects. React, TypeScript, full-stack reviews and pair programming.",
    category: "Engineering", tags: ["React", "TypeScript", "Full Stack"],
    members: 8742, joined: true, trending: true,
  },
  {
    id: "c_aiml", slug: "ai-ml", name: "AI / ML Lab", iconChar: "∇",
    description: "Papers, notebooks, study circles for transformers, RL, and deep learning.",
    category: "Research", tags: ["ML", "Papers", "PyTorch"],
    members: 6210, joined: false, trending: true, recommended: true,
  },
  {
    id: "c_swm", slug: "study-with-me", name: "Study With Me", iconChar: "◐",
    description: "Synced focus sessions across timezones. Accountability over noise.",
    category: "Accountability", tags: ["Pomodoro", "Focus", "Daily"],
    members: 21560, joined: true, recommended: true,
  },
  {
    id: "c_cp", slug: "competitive-programming", name: "CP Arena", iconChar: "Σ",
    description: "Codeforces rounds, post-mortems, editorial discussions, weekly ladders.",
    category: "Competitive", tags: ["Codeforces", "Contests"],
    members: 4980, joined: false,
  },
  {
    id: "c_exam", slug: "exam-prep", name: "Exam Prep Hall", iconChar: "✎",
    description: "GATE, JEE, NEET, GRE — structured plans, mock tests, accountability cohorts.",
    category: "Exams", tags: ["GATE", "GRE", "Mocks"],
    members: 15700, joined: false, recommended: true,
  },
];

export const SEED_CHANNELS: Channel[] = [
  // DSA
  { id: "ch_dsa_general",   communityId: "c_dsa", name: "general",        topic: "Community-wide chat" },
  { id: "ch_dsa_resources", communityId: "c_dsa", name: "resources",      topic: "Books, sheets, links", pinned: true },
  { id: "ch_dsa_progress",  communityId: "c_dsa", name: "daily-progress", topic: "Post your daily DSA log", unread: 3 },
  { id: "ch_dsa_questions", communityId: "c_dsa", name: "questions",      topic: "Ask anything technical" },
  { id: "ch_dsa_sessions",  communityId: "c_dsa", name: "session-links",  topic: "Live focus rooms" },
  { id: "ch_dsa_announce",  communityId: "c_dsa", name: "announcements",  topic: "Mods only", pinned: true },
  // Web
  { id: "ch_web_general",   communityId: "c_web", name: "general" },
  { id: "ch_web_reviews",   communityId: "c_web", name: "code-reviews",   topic: "Drop a PR for review" },
  { id: "ch_web_resources", communityId: "c_web", name: "resources",      pinned: true },
  { id: "ch_web_showcase",  communityId: "c_web", name: "showcase",       topic: "Ship-it Fridays" },
  // SWM
  { id: "ch_swm_general",   communityId: "c_swm", name: "general" },
  { id: "ch_swm_sessions",  communityId: "c_swm", name: "session-links",  topic: "Hop into a live room", unread: 1 },
  { id: "ch_swm_progress",  communityId: "c_swm", name: "daily-progress" },
];
