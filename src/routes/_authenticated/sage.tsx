import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageHeader, Card } from "../../components/ui-kit/Card";

export const Route = createFileRoute("/_authenticated/sage")({
  head: () => ({ meta: [{ title: "Sage — Sync & Study" }] }),
  component: SagePage,
});

const PROMPTS = [
  "Plan my study day around my open tasks",
  "Quiz me on the subject I focused on most this week",
  "Summarize what I worked on yesterday",
  "Suggest a 90-minute focus block schedule",
];

function SagePage() {
  return (
    <>
      <PageHeader eyebrow="AI Companion" title="Sage" sub="Your study copilot" />
      <div className="ss-body">
        <Card style={{ borderColor: "oklch(0.96 0.21 110 / 0.35)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "oklch(0.96 0.21 110 / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", flexShrink: 0 }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div className="ss-display" style={{ fontWeight: 700, fontSize: "1rem" }}>Hey, I'm Sage.</div>
              <p style={{ fontSize: "0.85rem", color: "var(--color-muted-foreground)", marginTop: 6, lineHeight: 1.5 }}>
                I'll have access to your tasks, focus history, and goals to give grounded suggestions. Streaming chat ships in the next milestone.
              </p>
            </div>
          </div>
        </Card>

        <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase", margin: "22px 0 10px" }}>
          Try asking
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PROMPTS.map((p) => (
            <button
              key={p}
              className="ss-card"
              style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--color-border)", padding: 14, fontSize: "0.85rem" }}
              onClick={() => alert("Sage chat ships in Milestone 4")}
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); alert("Sage chat ships in Milestone 4"); }}
          style={{ marginTop: 16, display: "flex", gap: 8 }}
        >
          <input className="ss-input" placeholder="Ask Sage anything…" />
          <button className="ss-btn ss-btn-primary" type="submit">Send</button>
        </form>
      </div>
    </>
  );
}
