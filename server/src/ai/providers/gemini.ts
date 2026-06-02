import type { AiMessage, AiProvider } from "../provider.js";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1/models";

function buildBody(messages: AiMessage[], opts?: { temperature?: number; maxTokens?: number }) {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const nonSys = messages.filter((m) => m.role !== "system");
  const contents = nonSys.map((m, idx) => {
    let contentText = m.content;
    if (idx === 0 && sys) {
      contentText = `System Instructions:\n${sys}\n\nUser Message:\n${m.content}`;
    }
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: contentText }],
    };
  });
  return {
    contents,
    generationConfig: {
      temperature: opts?.temperature ?? 0.7,
      maxOutputTokens: opts?.maxTokens ?? 1024,
    },
  };
}

export function geminiProvider(apiKey: string, model = "gemini-2.0-flash-lite"): AiProvider {
  return {
    name: "gemini",
    async chat(messages, opts) {
      const r = await fetch(`${ENDPOINT}/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(messages, opts)),
      });
      if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
      const data = await r.json() as any;
      return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    },
    async stream(messages, onToken, opts) {
      const r = await fetch(`${ENDPOINT}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(messages, opts)),
      });
      if (!r.ok || !r.body) throw new Error(`Gemini stream ${r.status}: ${await r.text()}`);
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          const line = p.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          try {
            const json = JSON.parse(line.slice(5).trim());
            const text = json?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).join("") ?? "";
            if (text) onToken(text);
          } catch { /* ignore */ }
        }
      }
    },
  };
}
