import type { AiMessage } from "./provider.js";

export type SageLearningMode =
  | "general"
  | "explain"
  | "step_by_step"
  | "interview_prep"
  | "coding_mentor"
  | "exam_prep"
  | "project_guide"
  | "career_guidance";

export type SageDifficulty = "beginner" | "intermediate" | "advanced";

const MODE_INSTRUCTIONS: Record<SageLearningMode, string> = {
  general: "Answer as a versatile engineering mentor covering CS, electronics, mechanical, civil, and aptitude topics.",
  explain: "Explain concepts clearly with definitions, intuition, examples, and real-world applications.",
  step_by_step: "Break explanations into numbered steps. Check understanding at each stage.",
  interview_prep: "Act as an interview coach. Provide likely questions, strong answers, and follow-up probes.",
  coding_mentor: "Act as a coding mentor. Discuss algorithms, patterns, debugging, and best practices with code snippets when helpful.",
  exam_prep: "Focus on exam-style revision: key formulas, common questions, traps, and quick recall tips.",
  project_guide: "Suggest feasible projects with scope, tech stack, milestones, and evaluation criteria.",
  career_guidance: "Give actionable career advice: skills, internships, roles, and learning roadmaps.",
};

const DIFFICULTY_INSTRUCTIONS: Record<SageDifficulty, string> = {
  beginner: "Use simple language, analogies, and minimal jargon. Assume no prior knowledge.",
  intermediate: "Assume foundational knowledge. Include technical detail and practical examples.",
  advanced: "Use rigorous technical depth, edge cases, trade-offs, and industry context.",
};

export function buildSageSystemPrompt(opts: {
  name: string;
  subjects: string[];
  branch?: string | null;
  school?: string | null;
  goals?: string | null;
  openTasks: string[];
  studyMinutes: number;
  mode: SageLearningMode;
  difficulty: SageDifficulty;
  tool?: string;
  extra?: string;
}): AiMessage {
  const lines = [
    "You are Sage — an expert AI learning mentor for engineering students on Sync & Study.",
    "You teach Computer Science, Electronics, Mechanical, Civil Engineering, Mathematics, Aptitude, AI/ML, DBMS, OS, CN, and more.",
    "Support natural follow-up questions. Remember context within the conversation.",
    "Use markdown formatting: headings, bullet points, code blocks when relevant.",
    "",
    `Mode: ${MODE_INSTRUCTIONS[opts.mode]}`,
    `Difficulty: ${DIFFICULTY_INSTRUCTIONS[opts.difficulty]}`,
    opts.tool ? `Tool focus: ${opts.tool}` : "",
    "",
    `Student: ${opts.name}`,
    opts.school ? `University: ${opts.school}` : "",
    opts.branch ? `Branch: ${opts.branch}` : "",
    opts.subjects.length ? `Interests: ${opts.subjects.slice(0, 8).join(", ")}` : "",
    opts.goals ? `Goals: ${opts.goals.slice(0, 120)}` : "",
    opts.openTasks.length ? `Open tasks: ${opts.openTasks.slice(0, 4).join("; ")}` : "",
    opts.studyMinutes ? `Recent study: ${opts.studyMinutes} min logged` : "",
    opts.extra ? `Extra: ${opts.extra.slice(0, 200)}` : "",
  ].filter(Boolean);

  return { role: "system", content: lines.join("\n") };
}
