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

export type SageTool =
  | "chat"
  | "flashcards"
  | "quiz"
  | "mock_interview"
  | "coding_challenge"
  | "study_plan";

export const LEARNING_MODES: {
  id: SageLearningMode;
  label: string;
  icon: string;
  description: string;
  example: string;
}[] = [
  { id: "general", label: "General", icon: "💬", description: "Open-ended engineering help", example: "Explain how TCP/IP works" },
  { id: "explain", label: "Explain Concept", icon: "📖", description: "Clear concept explanations with examples", example: "Teach me Operating Systems" },
  { id: "step_by_step", label: "Step-by-Step", icon: "🪜", description: "Break topics into learning steps", example: "Explain Dijkstra's Algorithm step by step" },
  { id: "interview_prep", label: "Interview Prep", icon: "🎯", description: "Technical & HR interview practice", example: "Help me prepare for Java interviews" },
  { id: "coding_mentor", label: "Coding Mentor", icon: "💻", description: "Debug, patterns, and code review", example: "Walk me through dynamic programming" },
  { id: "exam_prep", label: "Exam Prep", icon: "📝", description: "Syllabus-focused revision", example: "Create a DBMS revision plan" },
  { id: "project_guide", label: "Project Guide", icon: "🚀", description: "Final year & portfolio projects", example: "Suggest final year projects for AI" },
  { id: "career_guidance", label: "Career Guidance", icon: "🎓", description: "Internships, roles, and roadmaps", example: "Roadmap for cloud engineering" },
];

export const SAGE_TOOLS: {
  id: SageTool;
  label: string;
  icon: string;
  promptPrefix: string;
}[] = [
  { id: "flashcards", label: "Flashcards", icon: "🃏", promptPrefix: "Generate 6 flashcards (Q on one line, A on next) for: " },
  { id: "quiz", label: "Practice Quiz", icon: "❓", promptPrefix: "Generate 5 MCQs with answers explained for: " },
  { id: "mock_interview", label: "Mock Interview", icon: "🎤", promptPrefix: "Conduct a mock technical interview on: " },
  { id: "coding_challenge", label: "Coding Challenge", icon: "⚡", promptPrefix: "Give me a coding challenge with hints for: " },
  { id: "study_plan", label: "Study Plan", icon: "📅", promptPrefix: "Create a 7-day study plan for: " },
];

export const DIFFICULTY_LEVELS: { id: SageDifficulty; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export const ENGINEERING_PROMPTS = [
  "Teach me Operating Systems — processes vs threads",
  "Explain Dijkstra's Algorithm with an example",
  "Help me prepare for Java interviews",
  "Suggest final year projects for AI/ML",
  "Generate MCQs on DBMS normalization",
  "Explain CNN architecture for beginners",
  "Solve an aptitude problem: trains meeting",
  "Create a study plan for GATE CS",
];
