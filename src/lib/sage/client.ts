/**
 * Sage streaming client.
 *
 * Calls the /api/sage server route and surfaces incoming SSE frames to the
 * caller via `onToken` / `onError`. Returns a handle with `cancel()` and a
 * `done` promise. Replaces the old mock streamer one-for-one.
 *
 * Cross-platform: uses standard fetch + ReadableStream. On native shells
 * (Capacitor) the same code works against the same hosted API origin.
 */
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
  const controller = new AbortController();
  let cancelled = false;

  const done = (async () => {
    try {
      const res = await fetch("/api/sage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        handlers.onError?.(`Sage server returned ${res.status}`);
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
        for (const evt of events) parseEvent(evt, handlers);
      }
    } catch (err) {
      if (!cancelled) handlers.onError?.((err as Error).message ?? "Stream failed");
    }
  })();

  return {
    cancel() {
      cancelled = true;
      controller.abort();
    },
    done,
  };
}

function parseEvent(raw: string, handlers: { onToken: (t: string) => void; onError?: (m: string) => void }) {
  let event: string | undefined;
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^\s/, ""));
  }
  if (dataLines.length === 0) return;
  const data = dataLines.join("\n");
  if (event === "done") return;
  if (event === "error") {
    try {
      const parsed = JSON.parse(data) as { message?: string };
      handlers.onError?.(parsed.message ?? "Sage error");
    } catch {
      handlers.onError?.(data);
    }
    return;
  }
  // Default event: a raw text fragment from the model
  handlers.onToken(data);
}
