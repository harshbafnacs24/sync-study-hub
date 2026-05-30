import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Play, Pause, X, RotateCcw, Target, Music, ChevronDown, CheckCircle2, Clock, Flame, TrendingUp, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../components/ui-kit/Card";
import { useFocusTimer } from "../../lib/hooks/use-focus-timer";
import { useAnalytics, useTasks } from "../../lib/hooks/use-data";
import type { SessionKind } from "../../lib/store/sessions";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({ meta: [{ title: "Focus — Sync & Study" }] }),
  component: FocusPage,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: { kind: SessionKind; label: string; color: string; defaultMins: number; emoji: string }[] = [
  { kind: "focus",       label: "Deep Focus",   color: "#C8FF00", defaultMins: 25, emoji: "⚡" },
  { kind: "short_break", label: "Short Break",  color: "#3DDC84", defaultMins: 5,  emoji: "☕" },
  { kind: "long_break",  label: "Long Break",   color: "#4A9EFF", defaultMins: 15, emoji: "🧘" },
];

const CUSTOM_DURATIONS = [15, 25, 30, 45, 60, 90];

const SUBJECTS = ["Algorithms", "Data Structures", "DBMS", "OS", "Networks", "Maths", "Physics", "Chemistry", "English", "Placement Prep", "Project Work", "Other"];

const SOUNDS: { id: string; label: string; emoji: string; url: string }[] = [
  { id: "none",   label: "No sound",   emoji: "🔇", url: "" },
  { id: "lofi",   label: "Lo-fi",      emoji: "🎵", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "rain",   label: "Rain",       emoji: "🌧️", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "cafe",   label: "Café",       emoji: "☕", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "forest", label: "Forest",     emoji: "🌲", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
];

const POMODORO_CYCLE = 4; // sessions before long break

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function CircularTimer({ progress, size = 220, color, children }: { progress: number; size?: number; color: string; children: React.ReactNode }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }} />
      </svg>
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function FocusPage() {
  const analytics = useAnalytics();
  const tasks = useTasks();
  const a = analytics.data;

  // Mode & duration
  const [modeIdx, setModeIdx] = useState(0);
  const mode = MODES[modeIdx];
  const [customMins, setCustomMins] = useState(25);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Session config
  const [subject, setSubject] = useState("");
  const [showSubjects, setShowSubjects] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [dailyGoal, setDailyGoal] = useState<string>(() => localStorage.getItem("focus.dailyGoal") ?? "");
  const [showGoalInput, setShowGoalInput] = useState(false);

  // Sound
  const [soundId, setSoundId] = useState("none");
  const [showSounds, setShowSounds] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pomodoro cycle tracker
  const [cycleCount, setCycleCount] = useState<number>(() => Number(localStorage.getItem("focus.cycle") ?? "0"));
  const pomodorosUntilLong = POMODORO_CYCLE - (cycleCount % POMODORO_CYCLE);

  const timer = useFocusTimer((s) => {
    if (s.kind === "focus") {
      const next = cycleCount + 1;
      setCycleCount(next);
      localStorage.setItem("focus.cycle", String(next));
      const isLongBreak = next % POMODORO_CYCLE === 0;
      toast.success(`Focus complete! ${isLongBreak ? "Time for a long break 🧘" : "Short break time ☕"}`, { duration: 5000 });
      // Auto-suggest next mode
      setModeIdx(isLongBreak ? 2 : 1);
    } else {
      toast("Break over — back to work! ⚡", { duration: 3000 });
      setModeIdx(0);
    }
    stopSound();
  });

  const total = timer.session?.plannedSeconds ?? customMins * 60;
  const remaining = timer.session ? timer.remaining : customMins * 60;
  const progress = total > 0 ? 1 - remaining / total : 0;

  // Sound control
  const playSound = (id: string) => {
    const s = SOUNDS.find(s => s.id === id);
    if (!s?.url) { stopSound(); return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(s.url);
    audio.loop = true; audio.volume = 0.3;
    audio.play().catch(() => {});
    audioRef.current = audio;
  };

  const stopSound = () => {
    audioRef.current?.pause();
    audioRef.current = null;
  };

  useEffect(() => {
    if (timer.isRunning && soundId !== "none") playSound(soundId);
    else if (!timer.isRunning) stopSound();
    return stopSound;
  }, [timer.isRunning, soundId]);

  const handleStart = () => {
    timer.start(mode.kind, mode.kind === "focus" ? customMins : mode.defaultMins, {
      subject: subject || null,
      taskId: linkedTaskId,
    });
  };

  const openTasks = tasks.data?.filter(t => t.status !== "done") ?? [];
  const linkedTask = openTasks.find(t => t.id === linkedTaskId);

  return (
    <>
      <PageHeader
        eyebrow="Deep work"
        title="Focus"
        sub={a ? `${a.todayFocusMinutes}m today · 🔥${a.streakDays}d streak` : "Ready to focus?"}
      />

      <div className="ss-body">

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { icon: <Clock size={13}/>, val: `${a?.todayFocusMinutes ?? 0}m`, label: "Today" },
            { icon: <Flame size={13}/>, val: `${a?.streakDays ?? 0}d`, label: "Streak" },
            { icon: <TrendingUp size={13}/>, val: `${a?.weeklySessions ?? 0}`, label: "Sessions" },
          ].map((s, i) => (
            <div key={i} className="ss-card" style={{ padding: "10px 8px", textAlign: "center" }}>
              <div style={{ color: "var(--color-primary)", marginBottom: 3 }}>{s.icon}</div>
              <div className="ss-display" style={{ fontSize: "1.1rem", fontWeight: 800 }}>{s.val}</div>
              <div className="ss-mono" style={{ fontSize: "0.58rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Daily goal ── */}
        <div className="ss-card" style={{ marginBottom: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <Target size={15} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
          {showGoalInput ? (
            <input
              autoFocus value={dailyGoal} placeholder="Set today's goal…"
              onChange={e => setDailyGoal(e.target.value)}
              onBlur={() => { localStorage.setItem("focus.dailyGoal", dailyGoal); setShowGoalInput(false); }}
              onKeyDown={e => { if (e.key === "Enter") { localStorage.setItem("focus.dailyGoal", dailyGoal); setShowGoalInput(false); } }}
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--color-foreground)", fontSize: "0.85rem", fontFamily: "var(--font-sans)" }}
            />
          ) : (
            <div style={{ flex: 1, fontSize: "0.85rem", color: dailyGoal ? "var(--color-foreground)" : "var(--color-muted-foreground)", cursor: "pointer" }}
              onClick={() => setShowGoalInput(true)}>
              {dailyGoal || "Tap to set today's goal…"}
            </div>
          )}
        </div>

        {/* ── Mode selector ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {MODES.map((m, i) => (
            <button key={m.kind} onClick={() => { setModeIdx(i); if (!timer.session) setCustomMins(m.defaultMins); }}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${modeIdx === i ? m.color + "55" : "var(--color-border)"}`,
                background: modeIdx === i ? m.color + "15" : "transparent", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: "1rem", marginBottom: 2 }}>{m.emoji}</div>
              <div className="ss-mono" style={{ fontSize: "0.6rem", color: modeIdx === i ? m.color : "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{m.label}</div>
            </button>
          ))}
        </div>

        {/* ── Timer ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
          <CircularTimer progress={progress} color={mode.color}>
            <div className="ss-mono" style={{ fontSize: "0.62rem", color: mode.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
              {timer.session ? (timer.isRunning ? "Focusing" : "Paused") : mode.label}
            </div>
            <div className="ss-display" style={{ fontSize: "3.4rem", fontWeight: 900, letterSpacing: "-0.04em", color: timer.isRunning ? mode.color : "var(--color-foreground)", lineHeight: 1 }}>
              {fmtTime(remaining)}
            </div>
            {subject && (
              <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>
                {subject}
              </div>
            )}
            {mode.kind === "focus" && (
              <div className="ss-mono" style={{ fontSize: "0.58rem", color: "var(--color-muted-foreground)", marginTop: 6 }}>
                🍅 {cycleCount % POMODORO_CYCLE}/{POMODORO_CYCLE} · {pomodorosUntilLong} until long break
              </div>
            )}
          </CircularTimer>
        </div>

        {/* ── Duration picker (focus mode only) ── */}
        {!timer.session && mode.kind === "focus" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {CUSTOM_DURATIONS.map(d => (
                <button key={d} onClick={() => setCustomMins(d)}
                  className={customMins === d ? "ss-btn ss-btn-primary" : "ss-btn ss-btn-outline"}
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}>
                  {d}m
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
          {!timer.session ? (
            <button className="ss-btn ss-btn-primary" onClick={handleStart} style={{ padding: "12px 32px", fontSize: "0.95rem", fontWeight: 700 }}>
              <Play size={16} /> Start {mode.label}
            </button>
          ) : (
            <>
              {timer.isRunning ? (
                <button className="ss-btn ss-btn-outline" onClick={timer.pause} style={{ padding: "10px 20px" }}>
                  <Pause size={14} /> Pause
                </button>
              ) : (
                <button className="ss-btn ss-btn-primary" onClick={timer.resume} style={{ padding: "10px 20px" }}>
                  <Play size={14} /> Resume
                </button>
              )}
              <button className="ss-btn ss-btn-outline" onClick={() => { timer.cancel(); stopSound(); }} style={{ padding: "10px 14px" }}>
                <X size={14} />
              </button>
              <button className="ss-btn ss-btn-outline" onClick={() => { timer.cancel(); stopSound(); setTimeout(handleStart, 100); }} style={{ padding: "10px 14px" }} title="Restart">
                <RotateCcw size={14} />
              </button>
            </>
          )}
        </div>

        {/* ── Subject picker ── */}
        {!timer.session && (
          <>
            <div className="ss-card" style={{ marginBottom: 8, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
              onClick={() => setShowSubjects(!showSubjects)}>
              <div style={{ fontSize: "0.85rem", color: subject ? "var(--color-foreground)" : "var(--color-muted-foreground)" }}>
                📚 {subject || "Select subject"}
              </div>
              <ChevronDown size={15} style={{ color: "var(--color-muted-foreground)", transform: showSubjects ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>
            {showSubjects && (
              <div className="ss-card" style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 12px" }}>
                {SUBJECTS.map(s => (
                  <button key={s} onClick={() => { setSubject(s === subject ? "" : s); setShowSubjects(false); }}
                    style={{ padding: "5px 12px", borderRadius: 20, fontSize: "0.78rem", cursor: "pointer", border: `1px solid ${subject === s ? "rgba(200,255,0,0.3)" : "var(--color-border)"}`,
                      background: subject === s ? "rgba(200,255,0,0.1)" : "transparent", color: subject === s ? "var(--color-primary)" : "var(--color-foreground)" }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Link to task ── */}
        {!timer.session && openTasks.length > 0 && (
          <div className="ss-card" style={{ marginBottom: 8, padding: "10px 14px" }}>
            <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Link to task</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={() => setLinkedTaskId(null)}
                style={{ padding: "6px 10px", borderRadius: 7, background: !linkedTaskId ? "rgba(200,255,0,0.1)" : "transparent",
                  border: `1px solid ${!linkedTaskId ? "rgba(200,255,0,0.25)" : "var(--color-border)"}`, color: !linkedTaskId ? "var(--color-primary)" : "var(--color-muted-foreground)", fontSize: "0.8rem", cursor: "pointer", textAlign: "left" }}>
                No task linked
              </button>
              {openTasks.slice(0, 4).map(t => (
                <button key={t.id} onClick={() => setLinkedTaskId(t.id === linkedTaskId ? null : t.id)}
                  style={{ padding: "6px 10px", borderRadius: 7, background: linkedTaskId === t.id ? "rgba(200,255,0,0.1)" : "transparent",
                    border: `1px solid ${linkedTaskId === t.id ? "rgba(200,255,0,0.25)" : "var(--color-border)"}`, color: linkedTaskId === t.id ? "var(--color-primary)" : "var(--color-foreground)", fontSize: "0.82rem", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                  {linkedTaskId === t.id && <CheckCircle2 size={13} style={{ flexShrink: 0 }} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Ambient sound ── */}
        <div className="ss-card" style={{ marginBottom: 14, padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showSounds ? 10 : 0, cursor: "pointer" }}
            onClick={() => setShowSounds(!showSounds)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Music size={14} style={{ color: "var(--color-primary)" }} />
              <span style={{ fontSize: "0.85rem", color: "var(--color-foreground)" }}>
                {SOUNDS.find(s => s.id === soundId)?.emoji} {SOUNDS.find(s => s.id === soundId)?.label}
              </span>
            </div>
            <ChevronDown size={14} style={{ color: "var(--color-muted-foreground)", transform: showSounds ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </div>
          {showSounds && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SOUNDS.map(s => (
                <button key={s.id} onClick={() => { setSoundId(s.id); setShowSounds(false); if (timer.isRunning) playSound(s.id); }}
                  style={{ padding: "6px 12px", borderRadius: 20, fontSize: "0.78rem", cursor: "pointer",
                    border: `1px solid ${soundId === s.id ? "rgba(200,255,0,0.3)" : "var(--color-border)"}`,
                    background: soundId === s.id ? "rgba(200,255,0,0.1)" : "transparent",
                    color: soundId === s.id ? "var(--color-primary)" : "var(--color-foreground)" }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Pomodoro guide ── */}
        <div className="ss-card" style={{ marginBottom: 14, background: "rgba(200,255,0,0.04)", border: "1px solid rgba(200,255,0,0.12)" }}>
          <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            🍅 Pomodoro Progress
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {Array.from({ length: POMODORO_CYCLE }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i < (cycleCount % POMODORO_CYCLE) ? "var(--color-primary)" : "rgba(255,255,255,0.08)" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}>
              {cycleCount % POMODORO_CYCLE}/{POMODORO_CYCLE} sessions
            </span>
            <button onClick={() => { setCycleCount(0); localStorage.setItem("focus.cycle", "0"); }}
              style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Reset
            </button>
          </div>
        </div>

        {/* ── Tips ── */}
        <div className="ss-card" style={{ padding: "10px 14px" }}>
          <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Focus Tips</div>
          {[
            "Phone face down + notifications off",
            "One task at a time — no tab switching",
            "Hydrate before each session",
            `Next long break in ${pomodorosUntilLong} session${pomodorosUntilLong === 1 ? "" : "s"}`,
          ].map((tip, i) => (
            <div key={i} style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)", padding: "4px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              · {tip}
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
