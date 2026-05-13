/**
 * Sage AI — server route.
 *
 * POST /api/sage
 * Body: { messages: {role:"user"|"sage", text:string}[], context?: SageContext }
 *
 * Proxies a streaming Gemini response back to the client as Server-Sent Events.
 * The client just appends each `data:` payload's text fragment to the current
 * assistant turn. Errors are emitted as `event: error\n` SSE frames so the UI
 * can surface them inline instead of silently hanging.
 *
 * Cross-platform: uses fetch + WHATWG streams only — runs in the Cloudflare
 * Worker runtime that Lovable ships, no Node-only APIs.
 */
import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface IncomingMessage { role: "user" | "sage"; text: string }
interface SageContext {
  profile?: { name?: string; subjects?: string[]; goals?: string | null; year?: string | null } | null;
  openTasks?: { title: string; priority: string; subject?: string | null; dueDate?: string | null }[];
  todayFocusMinutes?: number;
  weeklyFocusMinutes?: number;
  streakDays?: number;
  recentSubjects?: string[];
  joinedCommunities?: string[];
}

const SYSTEM_INSTRUCTION = `You are Sage, the AI study companion inside the Sync & Study app.

Personality: focused, calm, encouraging, never preachy. You speak like a senior peer who has seen this grind before. Use short paragraphs and bullet lists. Use **markdown bold** for headers.

You help with:
- planning a focused study day around the user's open tasks and energy
- short recall quizzes on weak topics
- summaries of recent focus history
- accountability nudges, never guilt

Rules:
- Always ground answers in the user's tasks, focus history, streak, and joined communities when present in context.
- If the user has no relevant data yet, say so plainly and suggest the smallest next step.
- Never invent task names, durations, streak numbers, or community names that aren't in context.
- Keep replies under ~180 words unless the user explicitly asks for a deep plan.
- Prefer one concrete next action over abstract advice.`;

function buildContextBlock(ctx: SageContext | undefined): string {
  if (!ctx) return "User context: (none provided)";
  const lines: string[] = ["User context:"];
  if (ctx.profile?.name) lines.push(`- Name: ${ctx.profile.name}`);
  if (ctx.profile?.year) lines.push(`- Year: ${ctx.profile.year}`);
  if (ctx.profile?.subjects?.length) lines.push(`- Subjects: ${ctx.profile.subjects.join(", ")}`);
  if (ctx.profile?.goals) lines.push(`- Goals: ${ctx.profile.goals}`);
  if (typeof ctx.streakDays === "number") lines.push(`- Streak: ${ctx.streakDays} day(s)`);
  if (typeof ctx.todayFocusMinutes === "number") lines.push(`- Today focus: ${ctx.todayFocusMinutes} min`);
  if (typeof ctx.weeklyFocusMinutes === "number") lines.push(`- This week focus: ${ctx.weeklyFocusMinutes} min`);
  if (ctx.recentSubjects?.length) lines.push(`- Recent focus subjects: ${ctx.recentSubjects.join(", ")}`);
  if (ctx.joinedCommunities?.length) lines.push(`- Joined communities: ${ctx.joinedCommunities.join(", ")}`);
  if (ctx.openTasks?.length) {
    lines.push(`- Open tasks (${ctx.openTasks.length}):`);
    for (const t of ctx.openTasks.slice(0, 12)) {
      const bits = [t.title, `[${t.priority}]`];
      if (t.subject) bits.push(`(${t.subject})`);
      if (t.dueDate) bits.push(`due ${t.dueDate}`);
      lines.push(`    • ${bits.join(" ")}`);
    }
  } else {
    lines.push(`- Open tasks: none`);
  }
  return lines.join("\n");
}

function sseFrameText(data: string, event?: string): string {
  const parts: string[] = [];
  if (event) parts.push(`event: ${event}`);
  for (const line of data.split("\n")) parts.push(`data: ${line}`);
  parts.push("", "");
  return parts.join("\n");
}
function sseFrameBytes(data: string, event?: string): Uint8Array {
  return new TextEncoder().encode(sseFrameText(data, event));
}

export const Route = createFileRoute("/api/sage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            sseFrameText(JSON.stringify({ message: "GEMINI_API_KEY is not configured" }), "error"),
            { status: 200, headers: sseHeaders() },
          );
        }

        let body: { messages?: IncomingMessage[]; context?: SageContext };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(
            sseFrameText(JSON.stringify({ message: "Invalid JSON body" }), "error"),
            { status: 200, headers: sseHeaders() },
          );
        }

        const messages = (body.messages ?? []).filter((m) => m && typeof m.text === "string" && m.text.trim().length > 0);
        if (messages.length === 0) {
          return new Response(
            sseFrameText(JSON.stringify({ message: "No messages provided" }), "error"),
            { status: 200, headers: sseHeaders() },
          );
        }

        const contents = messages.map((m) => ({
          role: m.role === "sage" ? "model" : "user",
          parts: [{ text: m.text }],
        }));

        const systemText = `${SYSTEM_INSTRUCTION}\n\n${buildContextBlock(body.context)}`;

        const upstreamUrl =
          `${GEMINI_BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

        const upstream = await fetch(upstreamUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemText }] },
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
            safetySettings: [],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "Upstream error");
          return new Response(
            sseFrameText(JSON.stringify({ message: `Gemini ${upstream.status}: ${errText.slice(0, 400)}` }), "error"),
            { status: 200, headers: sseHeaders() },
          );
        }

        // Transform Gemini SSE → our simplified SSE: each `data:` is the raw
        // text fragment (or empty when only metadata). Final `event: done`.
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            try {
              const { value, done } = await reader.read();
              if (done) {
                controller.enqueue(sseFrameBytes("[DONE]", "done"));
                controller.close();
                return;
              }
              buffer += decoder.decode(value, { stream: true });
              const events = buffer.split("\n\n");
              buffer = events.pop() ?? "";
              for (const evt of events) {
                const dataLines = evt
                  .split("\n")
                  .filter((l) => l.startsWith("data:"))
                  .map((l) => l.slice(5).trim());
                if (dataLines.length === 0) continue;
                const payload = dataLines.join("");
                if (!payload || payload === "[DONE]") continue;
                try {
                  const json = JSON.parse(payload) as {
                    candidates?: { content?: { parts?: { text?: string }[] } }[];
                    promptFeedback?: { blockReason?: string };
                  };
                  if (json.promptFeedback?.blockReason) {
                    controller.enqueue(sseFrameBytes(JSON.stringify({ message: `Blocked: ${json.promptFeedback.blockReason}` }), "error"),
                    );
                    continue;
                  }
                  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
                  if (text) controller.enqueue(sseFrameBytes(text));
                } catch {
                  // Ignore malformed chunks rather than blowing up the stream
                }
              }
            } catch (err) {
              controller.enqueue(sseFrameBytes(JSON.stringify({ message: (err as Error).message ?? "Stream error" }), "error"),
              );
              controller.close();
            }
          },
          cancel() {
            reader.cancel().catch(() => {});
          },
        });

        return new Response(stream, { status: 200, headers: sseHeaders() });
      },
    },
  },
});

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  };
}
