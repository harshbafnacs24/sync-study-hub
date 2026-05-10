import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Card, StatTile, SectionHeader } from "../../components/ui-kit/Card";
import { useFocusTimer } from "../../lib/hooks/use-focus-timer";
import { useAnalytics } from "../../lib/hooks/use-data";
import type { SessionKind } from "../../lib/store/sessions";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({ meta: [{ title: "Focus — Sync & Study" }] }),
  component: FocusPage,
});

const PRESETS: { kind: SessionKind; label: string; minutes: number }[] = [
  { kind: "focus", label: "Focus", minutes: 25 },
  { kind: "short_break", label: "Short break", minutes: 5 },
  { kind: "long_break", label: "Long break", minutes: 15 },
];

function FocusPage() {
  const analytics = useAnalytics();
  const [presetIdx, setPresetIdx] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [subject, setSubject] = useState("");

  const timer = useFocusTimer((s) => {
    toast.success(`${s.kind === "focus" ? "Focus" : "Break"} complete · ${Math.round(s.elapsedSeconds / 60)}m`);
  });

  const total = timer.session?.plannedSeconds ?? customMinutes * 60;
  const remaining = timer.session ? timer.remaining : customMinutes * 60;
  const progress = total > 0 ? 1 - remaining / total : 0;
  const a = analytics.data;

  return (
    <>
      <PageHeader
        eyebrow="Deep work"
        title="Focus"
        sub={a ? `${a.todayFocusMinutes}m today · ${a.streakDays}d streak` : ""}
      />

      <div className="ss-body">
        <Card style={{ padding: 24, textAlign: "center" }}>
          <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: timer.session ? "var(--color-primary)" : "var(--color-muted-foreground)" }}>
            {timer.session
              ? timer.session.kind === "focus" ? "Focus session" : timer.session.kind === "short_break" ? "Short break" : "Long break"
              : PRESETS[presetIdx].label}
          </div>
          <div
            className="ss-display"
            style={{
              fontSize: "4rem", fontWeight: 800, fontFamily: "var(--font-mono)",
              letterSpacing: "-0.04em", margin: "16px 0 4px",
              color: timer.isRunning ? "var(--color-primary)" : "var(--color-foreground)",
            }}
          >
            {fmtTime(remaining)}
          </div>
          <ProgressBar value={progress} />
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18 }}>
            {!timer.session ? (
              <button
                className="ss-btn ss-btn-primary"
                onClick={() => timer.start(PRESETS[presetIdx].kind, PRESETS[presetIdx].kind === "focus" ? customMinutes : PRESETS[presetIdx].minutes, { subject: subject || null })}
                style={{ padding: "12px 22px" }}
              >
                <Play size={16} /> Start
              </button>
            ) : (
              <>
                {timer.isRunning ? (
                  <button className="ss-btn ss-btn-outline" onClick={timer.pause} style={{ padding: "10px 18px" }}>
                    <Pause size={14} /> Pause
                  </button>
                ) : (
                  <button className="ss-btn ss-btn-primary" onClick={timer.resume} style={{ padding: "10px 18px" }}>
                    <Play size={14} /> Resume
                  </button>
                )}
                <button className="ss-btn ss-btn-danger" onClick={timer.cancel} style={{ padding: "10px 14px" }}>
                  <X size={14} /> End
                </button>
              </>
            )}
          </div>
        </Card>

        {!timer.session && (
          <>
            <SectionHeader eyebrow="Setup" title="Session" />
            <Card>
              <div className="ss-field" style={{ marginBottom: 12 }}>
                <label className="ss-label">Mode</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {PRESETS.map((p, i) => (
                    <button
                      key={p.kind}
                      type="button"
                      onClick={() => { setPresetIdx(i); if (p.kind !== "focus") setCustomMinutes(p.minutes); }}
                      className={presetIdx === i ? "ss-chip ss-chip-accent" : "ss-chip"}
                      style={{ cursor: "pointer", flex: 1, justifyContent: "center" }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {PRESETS[presetIdx].kind === "focus" && (
                <>
                  <div className="ss-field" style={{ marginBottom: 12 }}>
                    <label className="ss-label">Duration · {customMinutes}m</label>
                    <input
                      type="range" min={5} max={90} step={5}
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--color-primary)" }}
                    />
                  </div>
                  <div className="ss-field">
                    <label className="ss-label">Subject (optional)</label>
                    <input className="ss-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Calculus" />
                  </div>
                </>
              )}
            </Card>
          </>
        )}

        <SectionHeader eyebrow="Stats" title="This week" action={
          <button
            onClick={() => { localStorage.removeItem("ss.v1.sessions"); window.location.reload(); }}
            className="ss-btn-ghost"
            style={{ background: "none", border: 0, color: "var(--color-muted-foreground)", fontSize: "0.7rem", cursor: "pointer" }}
            aria-label="Reset stats"
          >
            <RotateCcw size={12} />
          </button>
        } />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <StatTile label="Focus minutes" value={a?.weeklyFocusMinutes ?? 0} accent />
          <StatTile label="Sessions" value={a?.weeklySessions ?? 0} />
        </div>
      </div>
    </>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: 4, background: "var(--bg-3)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: "100%", background: "var(--color-primary)", transition: "width 0.3s" }} />
    </div>
  );
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
