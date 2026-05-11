import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { geminiProvider } from "../../ai/providers/gemini.js";
import { mockProvider } from "../../ai/providers/mock.js";
import { buildContext } from "../../ai/context-builder.js";

export const sageRouter = Router();
sageRouter.use(requireAuth);

const provider = process.env.GEMINI_API_KEY
  ? geminiProvider(process.env.GEMINI_API_KEY)
  : mockProvider();

// Naive in-memory rate limit: 30 calls per user per minute.
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(userId: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(userId);
  if (!b || b.resetAt < now) { buckets.set(userId, { count: 1, resetAt: now + windowMs }); return true; }
  if (b.count >= max) return false;
  b.count += 1; return true;
}

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.string().max(2000).optional(),
});

sageRouter.post("/chat", validate(chatSchema), asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const { message, context } = req.body as z.infer<typeof chatSchema>;
  const sys = await buildContext(req.userId!, context);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    await provider.stream([sys, { role: "user", content: message }], (t) => {
      res.write(`data: ${JSON.stringify({ token: t })}\n\n`);
    });
    res.write("data: [DONE]\n\n");
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ error: e?.message ?? "stream failed" })}\n\n`);
  }
  res.end();
}));

const summarySchema = z.object({ communityId: z.string(), recent: z.array(z.string()).max(50).default([]) });
sageRouter.post("/community-summary", validate(summarySchema), asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const { recent } = req.body as z.infer<typeof summarySchema>;
  const sys = await buildContext(req.userId!, "Task: Summarize the recent activity of this study community in 4 short bullets, surfacing decisions, resources, and unresolved questions.");
  const text = await provider.chat([sys, { role: "user", content: `Recent messages:\n${recent.join("\n")}` }]);
  res.json({ summary: text });
}));

sageRouter.post("/study-recommendations", asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const sys = await buildContext(req.userId!, "Task: Recommend 3 specific study actions for the next 24h, grounded in tasks + recent focus history.");
  const text = await provider.chat([sys, { role: "user", content: "What should I work on next?" }]);
  res.json({ recommendations: text });
}));

sageRouter.post("/session-assistance", asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const sys = await buildContext(req.userId!, "Task: Coach the user through their next focus session — suggest a goal, duration, and check-in prompts.");
  const text = await provider.chat([sys, { role: "user", content: "Help me set up my next focus session." }]);
  res.json({ guidance: text });
}));
