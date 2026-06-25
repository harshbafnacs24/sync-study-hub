import {
  createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  sessionsStore, type FocusSession, type SessionKind, type IncompleteReason,
} from "../store/sessions";
import { socketBus } from "../socket";
import { useAuth } from "../auth-context";

interface FocusContextValue {
  session: FocusSession | null;
  remaining: number;
  isRunning: boolean;
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  start: (kind: SessionKind, minutes: number, opts?: {
    subject?: string | null;
    taskId?: string | null;
    taskGoal?: string | null;
    estimatedMinutes?: number | null;
    sharedWithFriends?: boolean;
  }) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  completeWithFeedback: (data: {
    status: "completed" | "partial" | "not_completed";
    achievement?: string;
    percent?: number;
    reason?: IncompleteReason;
    continueMinutes?: number;
  }) => void;
  showStartModal: boolean;
  setShowStartModal: (v: boolean) => void;
  dismissStart: () => void;
  pendingStart: { kind: SessionKind; minutes: number; taskId?: string | null; subject?: string | null } | null;
  requestStart: (kind: SessionKind, minutes: number, opts?: { taskId?: string | null; subject?: string | null }) => void;
  showCompletionModal: boolean;
  completedSession: FocusSession | null;
  dismissCompletion: () => void;
  checkpoint: { percent: number } | null;
  dismissCheckpoint: (action: "continue" | "change" | "pause") => void;
  isAlarmRinging: boolean;
  alarmSound: string;
  changeAlarmSound: (id: string) => void;
  stopAlarm: () => void;
  snoozeAlarm: () => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

const CHECKPOINTS = [25, 50, 75];

export function FocusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState(() => {
    const s = sessionsStore.active();
    return {
      session: s,
      remaining: s ? Math.max(0, s.plannedSeconds - s.elapsedSeconds) : 0,
      isRunning: s?.state === "running",
    };
  });
  const [focusMode, setFocusMode] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [pendingStart, setPendingStart] = useState<{ kind: SessionKind; minutes: number; taskId?: string | null; subject?: string | null } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedSession, setCompletedSession] = useState<FocusSession | null>(null);
  const [checkpoint, setCheckpoint] = useState<{ percent: number } | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const tickRef = useRef<number | null>(null);
  const warned5 = useRef(false);
  const warned1 = useRef(false);
  const inactivityWarned = useRef(false);

  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [alarmSound, setAlarmSound] = useState(() => localStorage.getItem("focus.alarmSound") ?? "forest");

  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);

  const triggerAlarm = useCallback(() => {
    setIsAlarmRinging(true);
    const soundFile = alarmSound === "rain" ? "/rain.mp3.mpeg" : "/forest.mp3.mpeg";
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current = null;
    }
    const audio = new Audio(soundFile);
    audio.loop = true;
    audio.volume = 0.8;
    audio.play().catch((err) => {
      console.error("Failed to play alarm audio:", err);
      toast.error("Failed to play alarm sound. Please check your browser audio permissions.");
    });
    alarmAudioRef.current = audio;

    if (navigator.vibrate) {
      navigator.vibrate([500, 500, 500, 500]);
      if (vibrationIntervalRef.current) {
        window.clearInterval(vibrationIntervalRef.current);
      }
      vibrationIntervalRef.current = window.setInterval(() => {
        navigator.vibrate([500, 500, 500, 500]);
      }, 2000);
    }
  }, [alarmSound]);

  const stopAlarm = useCallback(() => {
    setIsAlarmRinging(false);
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current = null;
    }
    if (vibrationIntervalRef.current) {
      window.clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  const changeAlarmSound = useCallback((id: string) => {
    setAlarmSound(id);
    localStorage.setItem("focus.alarmSound", id);
  }, []);

  const stop = useCallback(() => {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  // Global tick — runs on all pages
  useEffect(() => {
    if (!state.isRunning || !state.session) return;
    stop();
    tickRef.current = window.setInterval(() => {
      setState((prev) => {
        if (!prev.session || !prev.isRunning) return prev;
        const elapsed = prev.session.elapsedSeconds + 1;
        const remaining = Math.max(0, prev.session.plannedSeconds - elapsed);
        const updated: FocusSession = { ...prev.session, elapsedSeconds: elapsed };
        sessionsStore.setActive(updated);

        const progress = (elapsed / prev.session.plannedSeconds) * 100;
        const passed = updated.checkpointsPassed ?? [];

        for (const cp of CHECKPOINTS) {
          if (progress >= cp && !passed.includes(cp)) {
            sessionsStore.updateActive({ checkpointsPassed: [...passed, cp] });
            setCheckpoint({ percent: cp });
            break;
          }
        }

        if (remaining === 300 && !warned5.current) {
          warned5.current = true;
          toast.warning(`Only 5 minutes remaining. Can you complete "${updated.taskGoal || "your goal"}"?`, { duration: 8000 });
        }
        if (remaining === 60 && !warned1.current) {
          warned1.current = true;
          toast.error("1 minute left! Push through!", { duration: 10000 });
        }

        if (remaining === 0) {
          const finalized = sessionsStore.finalize(updated, "completed");
          triggerAlarm();
          if (updated.kind === "focus") {
            setCompletedSession(finalized);
            setShowCompletionModal(true);
            if (finalized.sharedWithFriends && user) {
              socketBus.emit("study:completed", {
                userId: user.id,
                name: user.name,
                taskGoal: finalized.taskGoal,
                minutes: Math.round(finalized.elapsedSeconds / 60),
              });
            }
          } else {
            toast("Break over — back to work! ⚡", { duration: 3000 });
          }
          return { session: null, remaining: 0, isRunning: false };
        }
        return { session: updated, remaining, isRunning: true };
      });
    }, 1000);
    return stop;
  }, [state.isRunning, state.session?.id, stop, user, triggerAlarm]);

  // Inactivity detection
  useEffect(() => {
    if (!state.isRunning || !state.session) return;
    const onActivity = () => { setLastActivity(Date.now()); inactivityWarned.current = false; };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity);
    const iv = window.setInterval(() => {
      if (Date.now() - lastActivity > 5 * 60 * 1000 && !inactivityWarned.current) {
        inactivityWarned.current = true;
        toast("Stay focused. Your study session is still running.", { duration: 6000 });
      }
    }, 30_000);
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.clearInterval(iv);
    };
  }, [state.isRunning, state.session, lastActivity]);

  // Smart reminders for planned goals
  useEffect(() => {
    const goals = sessionsStore.getPlannedGoals().filter((g) => !g.reminded);
    if (goals.length > 0 && !state.session) {
      const g = goals[0];
      toast.info(`You planned to study: ${g.title}`, {
        duration: 8000,
        action: { label: "Start", onClick: () => navigate({ to: "/focus" }) },
      });
      sessionsStore.markGoalReminded(g.title);
    }
  }, [state.session, navigate]);

  const start = useCallback((kind: SessionKind, minutes: number, opts?: Parameters<FocusContextValue["start"]>[2]) => {
    if (state.session) sessionsStore.finalize(state.session, "cancelled");
    warned5.current = false;
    warned1.current = false;
    const s = sessionsStore.start({ kind, plannedSeconds: minutes * 60, ...opts });
    setState({ session: s, remaining: s.plannedSeconds, isRunning: true });
    setShowStartModal(false);
    setPendingStart(null);
    if (opts?.sharedWithFriends && user) {
      socketBus.emit("study:started", {
        userId: user.id,
        name: user.name,
        taskGoal: opts.taskGoal,
        subject: opts.subject,
      });
    }
  }, [state.session, user]);

  const requestStart = useCallback((kind: SessionKind, minutes: number, opts?: { taskId?: string | null; subject?: string | null }) => {
    if (kind === "focus") {
      setPendingStart({ kind, minutes, ...opts });
      setShowStartModal(true);
    } else {
      start(kind, minutes, opts);
    }
  }, [start]);

  const pause = useCallback(() => {
    if (!state.session) return;
    setState((p) => ({ ...p, isRunning: false }));
    sessionsStore.updateActive({ state: "paused" });
  }, [state.session]);

  const resume = useCallback(() => {
    if (!state.session) return;
    setState((p) => ({ ...p, isRunning: true }));
    sessionsStore.updateActive({ state: "running" });
    setLastActivity(Date.now());
  }, [state.session]);

  const cancel = useCallback(() => {
    stopAlarm();
    if (state.session) sessionsStore.finalize(state.session, "cancelled");
    setState({ session: null, remaining: 0, isRunning: false });
    setCheckpoint(null);
  }, [state.session, stopAlarm]);

  const completeWithFeedback = useCallback((data: Parameters<FocusContextValue["completeWithFeedback"]>[0]) => {
    stopAlarm();
    if (!completedSession) return;
    const extra = {
      completionStatus: data.status,
      achievement: data.achievement ?? null,
      completionPercent: data.percent ?? (data.status === "completed" ? 100 : data.percent ?? 0),
      incompleteReason: data.reason ?? null,
    };
    sessionsStore.updateLog(completedSession.id, extra);
    sessionsStore.syncToServer({ ...completedSession, ...extra }).catch(() => {});

    setShowCompletionModal(false);

    if (data.status === "completed" || data.status === "partial") {
      const prompt = data.achievement
        ? `I just studied "${completedSession.taskGoal}". Here's what I learned: ${data.achievement}. Generate a summary, 3 revision questions, and flashcards.`
        : `I finished a study session on "${completedSession.taskGoal}". What did I likely learn? Give a summary, revision questions, and suggest the next topic.`;
      navigate({ to: "/sage", search: { prompt } });
    }

    if (data.status === "partial" && data.continueMinutes) {
      setTimeout(() => requestStart("focus", data.continueMinutes!), 500);
    }

    setCompletedSession(null);
  }, [completedSession, navigate, requestStart, stopAlarm]);

  const dismissCheckpoint = useCallback((action: "continue" | "change" | "pause") => {
    setCheckpoint(null);
    if (action === "pause") pause();
    if (action === "change") {
      pause();
      setPendingStart({ kind: "focus", minutes: Math.ceil(state.remaining / 60) });
      setShowStartModal(true);
    }
  }, [pause, state.remaining]);

  const dismissCompletion = () => {
    stopAlarm();
    setShowCompletionModal(false);
    setCompletedSession(null);
  };

  const dismissStart = useCallback(() => {
    setShowStartModal(false);
    setPendingStart(null);
  }, []);

  const snoozeAlarm = useCallback(() => {
    stopAlarm();
    start("focus", 5, { taskGoal: "Snooze (5m)" });
  }, [stopAlarm, start]);

  // Clean up alarm media context on unmount
  useEffect(() => {
    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current = null;
      }
      if (vibrationIntervalRef.current) {
        window.clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    };
  }, []);

  return (
    <FocusContext.Provider value={{
      session: state.session,
      remaining: state.remaining,
      isRunning: state.isRunning,
      focusMode,
      setFocusMode,
      start,
      pause,
      resume,
      cancel,
      completeWithFeedback,
      showStartModal,
      setShowStartModal,
      dismissStart,
      pendingStart,
      requestStart,
      showCompletionModal,
      completedSession,
      dismissCompletion,
      checkpoint,
      dismissCheckpoint,
      isAlarmRinging,
      alarmSound,
      changeAlarmSound,
      stopAlarm,
      snoozeAlarm,
    }}>
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}
