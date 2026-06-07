import { useEffect, useState } from "react";
import { socketBus } from "../../lib/socket";
import { useAuth } from "../../lib/auth-context";

interface StudyEvent {
  type: "started" | "completed";
  name: string;
  taskGoal?: string;
  subject?: string;
  minutes?: number;
  at: string;
}

export function FriendStudyActivity() {
  const { user } = useAuth();
  const [events, setEvents] = useState<StudyEvent[]>([]);

  useEffect(() => {
    const offStart = socketBus.on("study:started", (p: any) => {
      if (p.userId === user?.id) return;
      setEvents((prev) => [{ type: "started", name: p.name, taskGoal: p.taskGoal, subject: p.subject, at: new Date().toISOString() }, ...prev].slice(0, 5));
    });
    const offDone = socketBus.on("study:completed", (p: any) => {
      if (p.userId === user?.id) return;
      setEvents((prev) => [{ type: "completed", name: p.name, taskGoal: p.taskGoal, minutes: p.minutes, at: new Date().toISOString() }, ...prev].slice(0, 5));
    });
    return () => { offStart(); offDone(); };
  }, [user?.id]);

  if (events.length === 0) return null;

  return (
    <div className="ss-card" style={{ padding: 12, marginBottom: 12 }}>
      <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        Friend Activity
      </div>
      {events.map((e, i) => (
        <div key={i} style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", padding: "4px 0", borderBottom: i < events.length - 1 ? "1px solid var(--color-border)" : "none" }}>
          {e.type === "started" ? (
            <>📖 <strong style={{ color: "var(--color-foreground)" }}>{e.name}</strong> is studying {e.taskGoal || e.subject}</>
          ) : (
            <>🎉 <strong style={{ color: "var(--color-foreground)" }}>{e.name}</strong> completed a {e.minutes}m session{e.taskGoal ? `: ${e.taskGoal}` : ""}</>
          )}
        </div>
      ))}
    </div>
  );
}
