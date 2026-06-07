import { Link } from "@tanstack/react-router";
import { Pause, Play, Timer } from "lucide-react";
import { useFocus } from "../../lib/focus/focus-context";

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function GlobalTimerBar() {
  const { session, remaining, isRunning, pause, resume, focusMode } = useFocus();
  if (!session || focusMode) return null;

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 40,
      background: "linear-gradient(90deg, rgba(232,255,71,0.12), rgba(67,97,238,0.08))",
      borderBottom: "1px solid rgba(232,255,71,0.2)",
      padding: "6px 12px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <Timer size={14} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
      <Link to="/focus" style={{ flex: 1, textDecoration: "none", color: "inherit", minWidth: 0 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-primary)" }}>{fmtTime(remaining)}</div>
        <div style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {session.taskGoal || session.subject || "Focus session"}
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); isRunning ? pause() : resume(); }}
        className="ss-btn ss-btn-ghost"
        style={{ padding: 4, flexShrink: 0 }}
        aria-label={isRunning ? "Pause" : "Resume"}
      >
        {isRunning ? <Pause size={14} /> : <Play size={14} />}
      </button>
    </div>
  );
}
