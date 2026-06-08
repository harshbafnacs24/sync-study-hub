import type { AiMessage, AiProvider } from "../provider.js";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function buildBody(messages: AiMessage[], model: string, opts?: { temperature?: number; maxTokens?: number }) {
  const formattedMessages = messages.map((m) => {
    return {
      role: m.role,
      content: m.content,
    };
  });

  return {
    model,
    messages: formattedMessages,
    temperature: opts?.temperature ?? 0.7,
    max_tokens: opts?.maxTokens ?? 1024,
    stream: false,
  };
}

export function groqProvider(apiKey: string, model = "llama-3.3-70b-versatile"): AiProvider {
  return {
    name: "groq",
    async chat(messages, opts) {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(buildBody(messages, model, opts)),
      });
      if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
      const data = await r.json() as any;
      return data?.choices?.[0]?.message?.content ?? "";
    },
    async stream(messages, onToken, opts) {
      const body = buildBody(messages, model, opts);
      body.stream = true;

      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!r.ok || !r.body) throw new Error(`Groq stream ${r.status}: ${await r.text()}`);
      
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith("data:")) continue;
          const dataStr = cleanLine.slice(5).trim();
          if (dataStr === "[DONE]") continue;
          try {
            const json = JSON.parse(dataStr);
            const text = json?.choices?.[0]?.delta?.content ?? "";
            if (text) onToken(text);
          } catch { /* ignore */ }
        }
      }
    },
  };
}
