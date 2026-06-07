import { useState } from "react";
import { useFocus } from "../../lib/focus/focus-context";
import { sessionsStore } from "../../lib/store/sessions";
import type { IncompleteReason } from "../../lib/store/sessions";

const SUBJECTS = ["Algorithms", "Data Structures", "DBMS", "OS", "Networks", "Maths", "Physics", "Chemistry", "Java", "Placement Prep", "Other"];

export function FocusModals() {
  const focus = useFocus();
  return (
    <>
      {focus.showStartModal && focus.pendingStart && (
        <SessionStartModal
          minutes={focus.pendingStart.minutes}
          onStart={(data) => focus.start("focus", focus.pendingStart!.minutes, {
            ...data,
            taskId: focus.pendingStart!.taskId ?? null,
            subject: data.subject || focus.pendingStart!.subject || null,
          })}
          onCancel={focus.dismissStart}
        />
      )}
      {focus.checkpoint && (
        <CheckpointModal
          percent={focus.checkpoint.percent}
          taskGoal={focus.session?.taskGoal ?? "your task"}
          onAction={focus.dismissCheckpoint}
        />
      )}
      {focus.showCompletionModal && focus.completedSession && (
        <CompletionModal
          taskGoal={focus.completedSession.taskGoal ?? "your study goal"}
          onSubmit={focus.completeWithFeedback}
          onSkip={focus.dismissCompletion}
        />
      )}
    </>
  );
}

function SessionStartModal({ minutes, onStart, onCancel }: {
  minutes: number;
  onStart: (data: { taskGoal: string; subject: string; estimatedMinutes: number; sharedWithFriends: boolean }) => void;
  onCancel: () => void;
}) {
  const [taskGoal, setTaskGoal] = useState("");
  const [subject, setSubject] = useState("Algorithms");
  const [shared, setShared] = useState(false);

  const examples = [
    "Finish DBMS Unit 3",
    "Solve 10 DSA Questions",
    "Complete Java Assignment",
    "Learn Dijkstra's Algorithm",
  ];

  return (
    <Modal title="What will you complete?" onClose={onCancel}>
      <p style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", marginBottom: 12 }}>
        Set a clear goal for this {minutes}-minute session.
      </p>
      <input
        className="ss-input"
        placeholder="e.g. Finish DBMS Unit 3"
        value={taskGoal}
        onChange={(e) => setTaskGoal(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
        autoFocus
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {examples.map((ex) => (
          <button key={ex} type="button" onClick={() => setTaskGoal(ex)}
            style={{ padding: "4px 8px", borderRadius: 6, fontSize: "0.68rem", border: "1px solid var(--color-border)", background: "var(--bg-3)", cursor: "pointer", color: "var(--color-muted-foreground)" }}>
            {ex}
          </button>
        ))}
      </div>
      <label className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>Subject</label>
      <select className="ss-input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", marginBottom: 12 }}>
        {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", marginBottom: 16, cursor: "pointer" }}>
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
        Share study goal with friends
      </label>
      <button
        className="ss-btn ss-btn-primary"
        style={{ width: "100%", justifyContent: "center" }}
        disabled={!taskGoal.trim()}
        onClick={() => {
          sessionsStore.setPlannedGoal({ title: taskGoal.trim(), subject, plannedAt: new Date().toISOString() });
          onStart({ taskGoal: taskGoal.trim(), subject, estimatedMinutes: minutes, sharedWithFriends: shared });
        }}
      >
        Start {minutes} min Session
      </button>
    </Modal>
  );
}

function CheckpointModal({ percent, taskGoal, onAction }: {
  percent: number;
  taskGoal: string;
  onAction: (action: "continue" | "change" | "pause") => void;
}) {
  return (
    <Modal title={`${percent}% Checkpoint`} onClose={() => onAction("continue")}>
      <p style={{ fontSize: "0.88rem", marginBottom: 16, lineHeight: 1.5 }}>
        Are you still working on:<br />
        <strong style={{ color: "var(--color-primary)" }}>{taskGoal}</strong>?
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="ss-btn ss-btn-primary" style={{ justifyContent: "center" }} onClick={() => onAction("continue")}>Yes, continue</button>
        <button className="ss-btn ss-btn-outline" style={{ justifyContent: "center" }} onClick={() => onAction("change")}>Change task</button>
        <button className="ss-btn ss-btn-ghost" style={{ justifyContent: "center" }} onClick={() => onAction("pause")}>Pause timer</button>
      </div>
    </Modal>
  );
}

function CompletionModal({ taskGoal, onSubmit, onSkip }: {
  taskGoal: string;
  onSubmit: (data: any) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<"main" | "achievement" | "partial" | "reason">("main");
  const [achievement, setAchievement] = useState("");
  const [percent, setPercent] = useState(50);
  const [reason, setReason] = useState<IncompleteReason>("distracted");

  if (step === "main") {
    return (
      <Modal title="Session Complete!" onClose={onSkip}>
        <p style={{ fontSize: "0.85rem", marginBottom: 16 }}>Did you complete:<br /><strong>{taskGoal}</strong>?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="ss-btn ss-btn-primary" style={{ justifyContent: "center" }} onClick={() => setStep("achievement")}>✅ Yes, completed</button>
          <button className="ss-btn ss-btn-outline" style={{ justifyContent: "center" }} onClick={() => setStep("partial")}>🔄 Partially completed</button>
          <button className="ss-btn ss-btn-ghost" style={{ justifyContent: "center" }} onClick={() => setStep("reason")}>❌ Not completed</button>
        </div>
      </Modal>
    );
  }

  if (step === "achievement") {
    return (
      <Modal title="Great work!" onClose={onSkip}>
        <p style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", marginBottom: 10 }}>What did you achieve?</p>
        <textarea className="ss-input" rows={3} value={achievement} onChange={(e) => setAchievement(e.target.value)} placeholder="Summarize what you learned or completed..." style={{ width: "100%", marginBottom: 12 }} />
        <button className="ss-btn ss-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => onSubmit({ status: "completed", achievement })}>
          Save & Ask Sage
        </button>
      </Modal>
    );
  }

  if (step === "partial") {
    return (
      <Modal title="Partial progress" onClose={onSkip}>
        <p style={{ fontSize: "0.78rem", marginBottom: 10 }}>How much did you complete?</p>
        <input type="range" min={10} max={90} step={10} value={percent} onChange={(e) => setPercent(Number(e.target.value))} style={{ width: "100%", marginBottom: 8 }} />
        <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 12 }}>{percent}%</div>
        <button className="ss-btn ss-btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} onClick={() => onSubmit({ status: "partial", percent, continueMinutes: 15 })}>
          Continue 15 min timer
        </button>
        <button className="ss-btn ss-btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={() => onSubmit({ status: "partial", percent })}>
          Done for now
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="What happened?" onClose={onSkip}>
      <p style={{ fontSize: "0.78rem", marginBottom: 10 }}>Why wasn't the goal completed?</p>
      {([
        ["distracted", "Got distracted"],
        ["too_difficult", "Too difficult"],
        ["lack_of_time", "Lack of time"],
        ["other", "Other"],
      ] as [IncompleteReason, string][]).map(([id, label]) => (
        <button key={id} onClick={() => setReason(id)}
          style={{ display: "block", width: "100%", padding: "8px 12px", marginBottom: 6, borderRadius: 8, textAlign: "left", cursor: "pointer",
            border: reason === id ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
            background: reason === id ? "rgba(232,255,71,0.08)" : "var(--bg-2)", color: "var(--color-foreground)", fontSize: "0.82rem" }}>
          {label}
        </button>
      ))}
      <button className="ss-btn ss-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => onSubmit({ status: "not_completed", reason })}>
        Save feedback
      </button>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 16, padding: 20, width: "100%", maxWidth: 360, maxHeight: "85vh", overflowY: "auto" }}>
        <div className="ss-display" style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 14 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
