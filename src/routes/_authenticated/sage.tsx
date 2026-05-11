import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Database, ListChecks, Flame } from "lucide-react";
import { PageHeader } from "../../components/ui-kit/Card";
import { streamSageReply, type SageStreamHandle } from "../../lib/sage/mock-stream";

export const Route = createFileRoute("/_authenticated/sage")({
  head: () => ({ meta: [{ title: "Sage — Sync & Study" }] }),
  component: SagePage,
});

interface Turn { id: string; role: "user" | "sage"; text: string }

const PROMPTS = [
  "Plan my study day around my open tasks",
  "Quiz me on the subject I focused on most this week",
  "Summarize what I worked on yesterday",
  "Suggest a 90-minute focus block schedule",
];

function SagePage() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const handleRef = useRef<SageStreamHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => handleRef.current?.cancel(), []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const ask = (text: string) => {
    if (!text.trim() || streaming) return;
    setInput("");
    const userTurn: Turn = { id: `u_${Date.now()}`, role: "user", text };
    const sageId = `s_${Date.now()}`;
    setTurns((t) => [...t, userTurn, { id: sageId, role: "sage", text: "" }]);
    setStreaming(true);
    handleRef.current = streamSageReply(text, (chunk) => {
      setTurns((t) => t.map((x) => (x.id === sageId ? { ...x, text: x.text + chunk } : x)));
    });
    handleRef.current.done.then(() => setStreaming(false));
  };

  const empty = turns.length === 0;

  return (
    <>
      <PageHeader eyebrow="AI Companion" title="Sage" sub="Grounded in your tasks, focus history, and goals" />
      <div className="ss-body" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {empty ? (
            <Welcome onPick={ask} />
          ) : (
            turns.map((t) => <Turn key={t.id} t={t} />)
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", padding: "10px 14px", background: "var(--bg-2)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto", scrollbarWidth: "none" }}>
            <ContextChip icon={<ListChecks size={11} />} label="Tasks" />
            <ContextChip icon={<Flame size={11} />} label="Streak" />
            <ContextChip icon={<Database size={11} />} label="Sessions" />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} style={{ display: "flex", gap: 8 }}>
            <input
              className="ss-input"
              placeholder="Ask Sage anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={streaming}
            />
            <button type="submit" className="ss-btn ss-btn-primary" disabled={streaming || !input.trim()} style={{ padding: "0 14px" }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function Welcome({ onPick }: { onPick: (s: string) => void }) {
  return (
    <>
      <div className="ss-card" style={{ borderColor: "oklch(0.96 0.21 110 / 0.35)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "oklch(0.96 0.21 110 / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", flexShrink: 0 }}>
            <Sparkles size={16} />
          </div>
          <div>
            <div className="ss-display" style={{ fontWeight: 700, fontSize: "1rem" }}>Hey, I'm Sage.</div>
            <p style={{ fontSize: "0.85rem", color: "var(--color-muted-foreground)", marginTop: 6, lineHeight: 1.5 }}>
              I can plan your day, quiz you on weak topics, summarize your week, and nudge accountability — grounded in your tasks and focus history.
            </p>
          </div>
        </div>
      </div>
      <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase", margin: "6px 0 -4px" }}>
        Try asking
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PROMPTS.map((p) => (
          <button
            key={p}
            className="ss-card"
            style={{ textAlign: "left", cursor: "pointer", padding: 12, fontSize: "0.84rem" }}
            onClick={() => onPick(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </>
  );
}

function Turn({ t }: { t: Turn }) {
  if (t.role === "user") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "85%", background: "var(--color-primary)", color: "var(--color-primary-foreground)", padding: "9px 13px", borderRadius: 12, borderTopRightRadius: 4, fontSize: "0.88rem", lineHeight: 1.45 }}>
        {t.text}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "92%" }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: "oklch(0.96 0.21 110 / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", flexShrink: 0, marginTop: 2 }}>
        <Sparkles size={12} />
      </div>
      <div style={{ fontSize: "0.88rem", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--color-foreground)" }}>
        {t.text}
        {t.text === "" && <span className="ss-mono" style={{ color: "var(--color-muted-foreground)", fontSize: "0.75rem" }}>thinking…</span>}
      </div>
    </div>
  );
}

function ContextChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="ss-mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", border: "1px solid var(--color-border)", borderRadius: 999, fontSize: "0.6rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted-foreground)", background: "var(--bg-3)", flexShrink: 0 }}>
      {icon}{label}
    </span>
  );
}
