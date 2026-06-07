import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { geminiProvider } from "../../ai/providers/gemini.js";
import { mockProvider } from "../../ai/providers/mock.js";
import { buildContext } from "../../ai/context-builder.js";
import type { AiProvider } from "../../ai/provider.js";
import type { AiMessage } from "../../ai/provider.js";
import crypto from "crypto";

export const sageRouter = Router();
sageRouter.use(requireAuth);

let _cachedProvider: AiProvider | null = null;
let _cachedKey = "";
function getProvider(): AiProvider {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!key) return mockProvider();
  if (key !== _cachedKey) {
    _cachedProvider = geminiProvider(key, "gemini-1.5-flash-8b");
    _cachedKey = key;
  }
  return _cachedProvider!;
}

const responseCache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
function getCached(key: string) {
  const hit = responseCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.text;
  responseCache.delete(key);
  return null;
}
function setCache(key: string, text: string) {
  if (responseCache.size >= 100) {
    const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) responseCache.delete(oldest[0]);
  }
  responseCache.set(key, { text, ts: Date.now() });
}

const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(userId: string, max = 12, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(userId);
  if (!b || b.resetAt < now) { buckets.set(userId, { count: 1, resetAt: now + windowMs }); return true; }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

function cacheKey(userId: string, payload: string) {
  return crypto.createHash("md5").update(`${userId}:${payload}`).digest("hex");
}

const messageSchema = z.object({
  role: z.enum(["user", "sage", "assistant"]),
  text: z.string().min(1).max(4000),
});

const chatSchema = z.object({
  message: z.string().min(1).max(4000).optional(),
  messages: z.array(messageSchema).max(30).optional(),
  mode: z.enum(["general", "explain", "step_by_step", "interview_prep", "coding_mentor", "exam_prep", "project_guide", "career_guidance"]).default("general"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  tool: z.string().max(64).optional(),
  context: z.string().max(1000).optional(),
});

function toAiMessages(history: { role: string; text: string }[]): AiMessage[] {
  return history.map((m) => ({
    role: m.role === "sage" ? "assistant" as const : "user" as const,
    content: m.text,
  }));
}

sageRouter.post("/chat", validate(chatSchema), asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) {
    return res.status(429).json({ error: "Sage is taking a breather — try again in a minute." });
  }

  const body = req.body as z.infer<typeof chatSchema>;
  const history = body.messages?.length
    ? body.messages
    : body.message
      ? [{ role: "user" as const, text: body.message }]
      : [];

  if (!history.length) return res.status(400).json({ error: "No message provided" });

  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) return res.status(400).json({ error: "No user message in history" });

  const ck = cacheKey(req.userId!, JSON.stringify({ mode: body.mode, difficulty: body.difficulty, last: lastUser.text, len: history.length }));
  const cached = getCached(ck);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const streamCached = async (text: string) => {
    const words = text.split(" ");
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ token: word + " " })}\n\n`);
      await new Promise((r) => setTimeout(r, 12));
    }
    res.write("data: [DONE]\n\n");
    res.end();
  };

  if (cached) {
    await streamCached(cached);
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.write(`data: ${JSON.stringify({ error: "Sage AI is not configured on the server yet." })}\n\n`);
    res.end();
    return;
  }

  const sys = await buildContext(req.userId!, {
    extra: body.context,
    mode: body.mode,
    difficulty: body.difficulty,
    tool: body.tool,
  });

  const aiMessages: AiMessage[] = [
    sys,
    ...toAiMessages(history.slice(0, -1)),
    { role: "user", content: lastUser.text },
  ];

  const provider = getProvider();
  let fullText = "";
  try {
    await provider.stream(aiMessages, (token) => {
      fullText += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }, { maxTokens: 1200 });
    setCache(ck, fullText);
    res.write("data: [DONE]\n\n");
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    const friendly = msg.includes("429") || msg.includes("quota")
      ? "Sage hit the API rate limit — wait 60 seconds and try again."
      : "Sage encountered an error. Please try again.";
    res.write(`data: ${JSON.stringify({ error: friendly })}\n\n`);
  }
  res.end();
}));

const summarySchema = z.object({
  communityId: z.string(),
  recent: z.array(z.string()).max(20).default([]),
});
sageRouter.post("/community-summary", validate(summarySchema), asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const { recent } = req.body as z.infer<typeof summarySchema>;
  const sys = await buildContext(req.userId!, { extra: "Summarize in 3 short bullets.", mode: "general" });
  const text = await getProvider().chat([sys, { role: "user", content: `Messages:\n${recent.slice(0, 10).join("\n")}` }], { maxTokens: 200 });
  res.json({ summary: text });
}));

sageRouter.post("/study-recommendations", asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const sys = await buildContext(req.userId!, { mode: "career_guidance", difficulty: "intermediate" });
  const text = await getProvider().chat([sys, { role: "user", content: "Based on my profile, recommend courses, topics, projects, hackathons, and internships I should pursue. Format as bullet lists." }], { maxTokens: 600 });
  res.json({ recommendations: text });
}));

sageRouter.post("/session-assistance", asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const sys = await buildContext(req.userId!, { mode: "exam_prep" });
  const text = await getProvider().chat([sys, { role: "user", content: "Help me set up my next focus session with daily learning goals." }], { maxTokens: 400 });
  res.json({ guidance: text });
}));

sageRouter.post("/generate-quiz", asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const { topic, count = 5 } = req.body as { topic?: string; count?: number };
  const sys = await buildContext(req.userId!, { mode: "exam_prep", tool: "quiz" });
  const text = await getProvider().chat([sys, { role: "user", content: `Generate ${count} MCQs with answers for: ${topic ?? "general engineering aptitude"}` }], { maxTokens: 800 });
  res.json({ quiz: text });
}));

sageRouter.post("/generate-flashcards", asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const { topic, count = 6 } = req.body as { topic?: string; count?: number };
  const sys = await buildContext(req.userId!, { mode: "explain", tool: "flashcards" });
  const text = await getProvider().chat([sys, { role: "user", content: `Generate ${count} flashcards (Q: ... A: ...) for: ${topic ?? "data structures"}` }], { maxTokens: 800 });
  res.json({ flashcards: text });
}));
