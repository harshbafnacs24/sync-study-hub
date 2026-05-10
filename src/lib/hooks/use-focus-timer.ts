import { useEffect, useRef, useState, useCallback } from "react";
import { sessionsStore, type FocusSession, type SessionKind } from "../store/sessions";

interface TimerState {
  session: FocusSession | null;
  remaining: number; // seconds
  isRunning: boolean;
}

/** Drives a persistent Pomodoro tick and writes completed sessions to storage. */
export function useFocusTimer(onComplete?: (s: FocusSession) => void) {
  const [state, setState] = useState<TimerState>(() => {
    const s = sessionsStore.active();
    return {
      session: s,
      remaining: s ? Math.max(0, s.plannedSeconds - s.elapsedSeconds) : 0,
      isRunning: s?.state === "running",
    };
  });
  const tickRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stop = useCallback(() => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // tick
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
        if (remaining === 0) {
          const finalized = sessionsStore.finalize(updated, "completed");
          onCompleteRef.current?.(finalized);
          return { session: null, remaining: 0, isRunning: false };
        }
        return { session: updated, remaining, isRunning: true };
      });
    }, 1000);
    return stop;
  }, [state.isRunning, state.session?.id, stop]);

  const start = useCallback((kind: SessionKind, minutes: number, opts?: { subject?: string | null; taskId?: string | null }) => {
    if (state.session) sessionsStore.finalize(state.session, "cancelled");
    const s = sessionsStore.start({ kind, plannedSeconds: minutes * 60, ...opts });
    setState({ session: s, remaining: s.plannedSeconds, isRunning: true });
  }, [state.session]);

  const pause = useCallback(() => {
    if (!state.session) return;
    setState((p) => ({ ...p, isRunning: false }));
    sessionsStore.setActive({ ...state.session, state: "paused" });
  }, [state.session]);

  const resume = useCallback(() => {
    if (!state.session) return;
    setState((p) => ({ ...p, isRunning: true }));
    sessionsStore.setActive({ ...state.session, state: "running" });
  }, [state.session]);

  const cancel = useCallback(() => {
    if (state.session) sessionsStore.finalize(state.session, "cancelled");
    setState({ session: null, remaining: 0, isRunning: false });
  }, [state.session]);

  return { ...state, start, pause, resume, cancel };
}
