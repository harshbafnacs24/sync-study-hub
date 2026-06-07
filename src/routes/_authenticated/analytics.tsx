import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, EmptyState, Card } from "../../components/ui-kit/Card";
import { useAnalytics } from "../../lib/hooks/use-data";
import { computeStreakBadges, sessionsStore } from "../../lib/store/sessions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Sync & Study" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: a } = useAnalytics();
  const max = Math.max(1, ...(a?.byDay ?? []).map((d) => d.minutes));
  const maxSubject = Math.max(1, ...(a?.bySubject ?? []).map((s) => s.minutes));
  const totalSessions = sessionsStore.logs().filter((s) => s.kind === "focus" && s.state === "completed").length;
  const badges = a ? computeStreakBadges(a, totalSessions) : [];

  return (
    <>
      <PageHeader eyebrow="Insights" title="Productivity Analytics" sub={a ? `${a.totalHours}h total · ${a.completionRate}% completion rate` : ""} />
      <div className="ss-body">
        {!a || a.weeklyFocusMinutes === 0 ? (
          <EmptyState title="No data yet" description="Run a few focus sessions and your analytics will populate here." />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[
                { label: "Today", value: `${a.todayFocusMinutes}m`, sub: `${a.todaySessions} sessions` },
                { label: "This Week", value: `${a.weeklyFocusMinutes}m`, sub: `${a.weeklySessions} sessions` },
                { label: "This Month", value: `${a.monthlyFocusMinutes}m`, sub: `${a.monthlySessions} sessions` },
                { label: "Avg Session", value: `${a.avgSessionMinutes}m`, sub: `${a.streakDays}d streak` },
              ].map((s) => (
                <Card key={s.label} style={{ padding: 12, textAlign: "center" }}>
                  <div className="ss-mono" style={{ fontSize: "0.58rem", color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>{s.label}</div>
                  <div className="ss-display" style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-primary)", marginTop: 4 }}>{s.value}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>{s.sub}</div>
                </Card>
              ))}
            </div>

            <Card style={{ marginBottom: 12 }}>
              <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>
                Last 7 Days
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, marginTop: 14 }}>
                {a.byDay.map((d) => (
                  <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div
                      title={`${d.minutes}m`}
                      style={{
                        width: "100%",
                        height: `${(d.minutes / max) * 100}%`,
                        background: d.minutes > 0 ? "var(--color-primary)" : "var(--bg-3)",
                        borderRadius: 4,
                        minHeight: 4,
                        transition: "height 0.3s",
                      }}
                    />
                    <span className="ss-mono" style={{ fontSize: "0.55rem", color: "var(--color-muted-foreground)" }}>
                      {new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })[0]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {a.bySubject.length > 0 && (
              <Card style={{ marginBottom: 12 }}>
                <div className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", marginBottom: 12 }}>By Subject</div>
                {a.bySubject.map((s) => (
                  <div key={s.subject} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 4 }}>
                      <span>{s.subject}</span>
                      <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{s.minutes}m</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--bg-3)" }}>
                      <div style={{ height: "100%", width: `${(s.minutes / maxSubject) * 100}%`, background: "var(--color-primary)", borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </Card>
            )}

            <Card style={{ marginBottom: 12 }}>
              <div className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", marginBottom: 10 }}>Learning Streaks & Badges</div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }} className="hide-scrollbar">
                {badges.map((b) => (
                  <div key={b.id} style={{
                    minWidth: 88, padding: 10, borderRadius: 12, textAlign: "center",
                    background: b.unlocked ? "rgba(232,255,71,0.08)" : "var(--bg-2)",
                    border: b.unlocked ? "1px solid rgba(232,255,71,0.3)" : "1px solid var(--color-border)",
                    opacity: b.unlocked ? 1 : 0.45,
                  }}>
                    <div style={{ fontSize: "1.3rem" }}>{b.icon}</div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, marginTop: 4 }}>{b.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: "0.72rem", color: "var(--color-muted-foreground)" }}>
                Weekly streak: {a.weeklyStreak} week{a.weeklyStreak !== 1 ? "s" : ""} · Completion rate: {a.completionRate}%
              </div>
            </Card>

            <Link to="/focus" className="ss-btn ss-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              Start a Focus Session
            </Link>
          </>
        )}
      </div>
    </>
  );
}
