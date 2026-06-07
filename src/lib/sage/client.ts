import { API_BASE_URL, tokenStore } from "../api-client";
import { streamSageReply } from "./mock-stream";

export interface SageStreamHandle {
  cancel: () => void;
  done: Promise<void>;
}

export interface SageMessageInput {
  role: "user" | "sage";
  text: string;
}

export function streamSage(
  payload: { messages: SageMessageInput[]; context?: unknown },
  handlers: { onToken: (text: string) => void; onError?: (message: string) => void },
): SageStreamHandle {
  if (typeof window !== "undefined" && window.localStorage.getItem("sas.demo_mode") === "true") {
    const userPrompt = payload.messages.filter(m => m.role === "user").at(-1)?.text ?? "";
    return streamSageReply(userPrompt, handlers.onToken);
  }
  const controller = new AbortController();
  let cancelled = false;

  const done = (async () => {
    try {
      const token = tokenStore.get();
      const res = await fetch(`${API_BASE_URL}/api/v1/sage/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: payload.messages.filter(m => m.role === "user").at(-1)?.text ?? "",
          context: typeof payload.context === "string" ? payload.context : JSON.stringify(payload.context ?? ""),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => `status ${res.status}`);
        handlers.onError?.(`Sage error: ${errText}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.replace(/^data:\s*/, "").trim();
          if (!line || line === "[DONE]") continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.token) handlers.onToken(parsed.token);
            if (parsed.error) handlers.onError?.(parsed.error);
          } catch { /* ignore malformed frames */ }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        handlers.onError?.(e?.message ?? "Sage connection failed");
      }
    }
  })();

  return {
    cancel: () => { cancelled = true; controller.abort(); },
    done,
  };
}
