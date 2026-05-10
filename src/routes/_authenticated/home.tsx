import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Plus, Play, Sparkles, ChevronRight } from "lucide-react";
import { Card, PageHeader, SectionHeader, StatTile, EmptyState, PriorityBadge } from "../../components/ui-kit/Card";
import { useTasks, useAnalytics, useActiveSession, useToggleTask } from "../../lib/hooks/use-data";
import { useAuth } from "../../lib/auth-context";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Dashboard — Sync & Study" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const tasks = useTasks();
  const analytics = useAnalytics();
  const active = useActiveSession();
  const toggle = useToggleTask();

  const firstName = (user?.name ?? user?.email ?? "there").split(" ")[0].split("@")[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const upcoming = (tasks.data ?? [])
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, 4);

  const a = analytics.data;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hey, ${firstName}`}
        sub={`${today} · ${a?.todaySessions ?? 0} sessions today`}
        right={
          <Link
            to="/notifications"
            className="ss-btn ss-btn-outline"
            style={{ width: 38, height: 38, padding: 0, borderRadius: 999 }}
            aria-label="Notifications"
          >
            <Bell size={16} />
          </Link>
        }
      />

      <div className="ss-body">
        {/* Active session or quick-start */}
        {active.data ? (
          <Card style={{ borderColor: "var(--color-primary)", borderWidth: 1 }}>
            <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "var(--color-primary)", textTransform: "uppercase" }}>
              Active session · {active.data.kind === "focus" ? "Focus" : "Break"}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
              <div className="ss-display" style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                {fmtTime(Math.max(0, active.data.plannedSeconds - active.data.elapsedSeconds))}
              </div>
              <Link to="/focus" className="ss-btn ss-btn-primary" style={{ padding: "8px 14px", fontSize: "0.8rem" }}>
                Open
              </Link>
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div className="ss-display" style={{ fontSize: "1.1rem", fontWeight: 700 }}>Start a focus block</div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>
                  25 min focus, 5 min break.
                </div>
              </div>
              <Link to="/focus" className="ss-btn ss-btn-primary" style={{ padding: "10px 14px" }}>
                <Play size={14} /> Start
              </Link>
            </div>
          </Card>
        )}

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <StatTile label="Today focus" value={`${a?.todayFocusMinutes ?? 0}m`} accent />
          <StatTile label="Streak" value={`${a?.streakDays ?? 0}d`} accent />
          <StatTile label="Week focus" value={`${a?.weeklyFocusMinutes ?? 0}m`} />
          <StatTile label="Open tasks" value={(tasks.data ?? []).filter((t) => t.status !== "done").length} />
        </div>

        {/* Upcoming tasks */}
        <SectionHeader
          eyebrow="Today"
          title="Upcoming tasks"
          action={
            <Link to="/tasks" className="ss-btn ss-btn-ghost" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
              All <ChevronRight size={14} />
            </Link>
          }
        />
        {upcoming.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="Plan your first task to start tracking productivity."
            action={
              <Link to="/tasks" className="ss-btn ss-btn-primary" style={{ padding: "8px 14px", fontSize: "0.8rem" }}>
                <Plus size={14} /> New task
              </Link>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map((t) => (
              <div key={t.id} className="ss-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => toggle.mutate(t.id)}
                  aria-label="Toggle complete"
                  style={{
                    width: 20, height: 20, borderRadius: 999,
                    border: "1.5px solid var(--color-border)",
                    background: t.status === "done" ? "var(--color-primary)" : "transparent",
                    cursor: "pointer", flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 500, textDecoration: t.status === "done" ? "line-through" : "none", color: t.status === "done" ? "var(--color-muted-foreground)" : "var(--color-foreground)" }}>
                    {t.title}
                  </div>
                  {t.dueDate && (
                    <div className="ss-mono" style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>
                      {t.dueDate}
                    </div>
                  )}
                </div>
                <PriorityBadge priority={t.priority} />
              </div>
            ))}
          </div>
        )}

        {/* Sage CTA */}
        <SectionHeader eyebrow="AI" title="Sage" />
        <Link to="/sage" style={{ textDecoration: "none" }}>
          <Card>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "oklch(0.96 0.21 110 / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", flexShrink: 0 }}>
                <Sparkles size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="ss-display" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Ask Sage</div>
                <div style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>
                  Plan your day, summarize notes, or get a quiz.
                </div>
              </div>
              <ChevronRight size={16} color="var(--color-muted-foreground)" />
            </div>
          </Card>
        </Link>
      </div>
    </>
  );
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
