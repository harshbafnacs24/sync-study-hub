import type { AiMessage, AiProvider } from "../provider.js";

/** Mock provider used when GEMINI_API_KEY is not configured. */
export function mockProvider(): AiProvider {
  return {
    name: "mock",
    async chat(messages) {
      const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
      return `Sage (mock): I would respond to "${last.slice(0, 80)}…" with a structured plan grounded in your tasks. Configure GEMINI_API_KEY to enable real responses.`;
    },
    async stream(messages, onToken) {
      const reply = await this.chat(messages);
      const tokens = reply.split(/(\s+)/);
      for (const t of tokens) {
        await new Promise((r) => setTimeout(r, 25));
        onToken(t);
      }
    },
  };
}
