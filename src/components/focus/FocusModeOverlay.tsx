import { Link } from "@tanstack/react-router";
import { Pause, Play, Sparkles, X } from "lucide-react";
import { useFocus } from "../../lib/focus/focus-context";

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function FocusModeOverlay() {
  const { session, remaining, isRunning, focusMode, setFocusMode, pause, resume } = useFocus();
  if (!focusMode || !session) return null;

  const progress = session.plannedSeconds > 0 ? 1 - remaining / session.plannedSeconds : 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "radial-gradient(circle at center, #0d0b14 0%, #050408 100%)",
      display: "flex", flexDirection: "column", padding: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <button onClick={() => setFocusMode(false)} className="ss-btn ss-btn-ghost" style={{ padding: "6px 10px", fontSize: "0.75rem" }}>
          <X size={14} /> Exit Focus Mode
        </button>
        <span className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Focus Mode
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 200, height: 200, borderRadius: "50%", border: "2px solid rgba(232,255,71,0.2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 24, position: "relative" }}>
          <svg width={200} height={200} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
            <circle cx={100} cy={100} r={94} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
            <circle cx={100} cy={100} r={94} fill="none" stroke="var(--color-primary)" strokeWidth={6}
              strokeDasharray={2 * Math.PI * 94} strokeDashoffset={2 * Math.PI * 94 * (1 - progress)} strokeLinecap="round" />
          </svg>
          <span className="ss-display" style={{ fontSize: "2.8rem", fontWeight: 900, color: "var(--color-primary)" }}>{fmtTime(remaining)}</span>
        </div>

        <div style={{ textAlign: "center", maxWidth: 300, marginBottom: 32 }}>
          <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>Current Task</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{session.taskGoal || session.subject || "Study Session"}</div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button onClick={isRunning ? pause : resume} className="ss-btn ss-btn-primary" style={{ padding: "10px 24px" }}>
            {isRunning ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Resume</>}
          </button>
        </div>

        <Link to="/sage" search={{ prompt: `Help me review what I'm studying: ${session.taskGoal || session.subject}` }}
          className="ss-btn ss-btn-outline" style={{ padding: "8px 16px", fontSize: "0.82rem" }}>
          <Sparkles size={14} /> Ask Sage
        </Link>
      </div>
    </div>
  );
}
