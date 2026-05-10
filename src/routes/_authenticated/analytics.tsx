import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState, Card } from "../../components/ui-kit/Card";
import { useAnalytics } from "../../lib/hooks/use-data";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Sync & Study" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: a } = useAnalytics();
  const max = Math.max(1, ...(a?.byDay ?? []).map((d) => d.minutes));

  return (
    <>
      <PageHeader eyebrow="Insights" title="Analytics" sub={a ? `${a.weeklyFocusMinutes}m this week` : ""} />
      <div className="ss-body">
        {!a || a.weeklyFocusMinutes === 0 ? (
          <EmptyState title="No data yet" description="Run a few focus sessions and your analytics will populate here." />
        ) : (
          <Card>
            <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>
              Last 7 days
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
        )}
      </div>
    </>
  );
}
