import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { geminiProvider } from "../../ai/providers/gemini.js";
import { mockProvider } from "../../ai/providers/mock.js";
import { buildContext } from "../../ai/context-builder.js";
import type { AiProvider } from "../../ai/provider.js";
import crypto from "crypto";

export const sageRouter = Router();
sageRouter.use(requireAuth);

// ── Cached provider — reuse same instance, recreate only if key changes ──────
let _cachedProvider: AiProvider | null = null;
let _cachedKey = "";
function getProvider(): AiProvider {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!key) return mockProvider();
  if (key !== _cachedKey) {
    _cachedProvider = geminiProvider(key, "gemini-1.5-flash-8b"); // lightest free model
    _cachedKey = key;
  }
  return _cachedProvider!;
}

// ── Response cache (5 min TTL) — prevents re-calling API for same question ───
const responseCache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
function getCached(key: string) {
  const hit = responseCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.text;
  responseCache.delete(key);
  return null;
}
function setCache(key: string, text: string) {
  // Keep cache small — evict oldest if over 100 entries
  if (responseCache.size >= 100) {
    const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) responseCache.delete(oldest[0]);
  }
  responseCache.set(key, { text, ts: Date.now() });
}

// ── Per-user rate limit — 8 req/min (free tier is 15 RPM shared) ─────────────
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(userId: string, max = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(userId);
  if (!b || b.resetAt < now) { buckets.set(userId, { count: 1, resetAt: now + windowMs }); return true; }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

function cacheKey(userId: string, message: string) {
  return crypto.createHash("md5").update(`${userId}:${message.trim().toLowerCase()}`).digest("hex");
}

const chatSchema = z.object({
  message: z.string().min(1).max(2000), // reduced from 4000
  context: z.string().max(1000).optional(),
});

sageRouter.post("/chat", validate(chatSchema), asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) {
    return res.status(429).json({
      error: "Sage is taking a breather ☕ — you've sent a lot of messages. Try again in a minute."
    });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "Sage AI is not configured on the server yet." });
  }

  const { message, context } = req.body as z.infer<typeof chatSchema>;

  // Check cache first
  const ck = cacheKey(req.userId!, message);
  const cached = getCached(ck);
  if (cached) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    // Stream cached response word by word for natural feel
    const words = cached.split(" ");
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ token: word + " " })}\n\n`);
      await new Promise(r => setTimeout(r, 18));
    }
    res.write("data: [DONE]\n\n");
    res.end();
    return;
  }

  const sys = await buildContext(req.userId!, context);
  const provider = getProvider();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let fullText = "";
  try {
    await provider.stream(
      [sys, { role: "user", content: message }],
      (token) => {
        fullText += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      },
      { maxTokens: 600 }, // reduced from 1024
    );
    setCache(ck, fullText);
    res.write("data: [DONE]\n\n");
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    const friendly = msg.includes("429") || msg.includes("quota")
      ? "Sage hit the API rate limit — please wait 60 seconds and try again."
      : msg.includes("400")
      ? "Sage couldn't process that message. Try rephrasing it."
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
  const sys = await buildContext(req.userId!, "Summarize in 3 short bullets.");
  const text = await getProvider().chat([sys, { role: "user", content: `Messages:\n${recent.slice(0, 10).join("\n")}` }], { maxTokens: 200 });
  res.json({ summary: text });
}));

sageRouter.post("/study-recommendations", asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const sys = await buildContext(req.userId!, "Give 3 specific study actions for the next 24h.");
  const text = await getProvider().chat([sys, { role: "user", content: "What should I work on next?" }], { maxTokens: 300 });
  res.json({ recommendations: text });
}));

sageRouter.post("/session-assistance", asyncHandler(async (req: AuthedRequest, res) => {
  if (!rateLimit(req.userId!)) return res.status(429).json({ error: "Rate limit exceeded" });
  const sys = await buildContext(req.userId!, "Coach the user for their next focus session.");
  const text = await getProvider().chat([sys, { role: "user", content: "Help me set up my next session." }], { maxTokens: 300 });
  res.json({ guidance: text });
}));
