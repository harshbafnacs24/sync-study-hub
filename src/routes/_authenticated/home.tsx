import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { api } from "../../lib/api-client";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Sync & Study" }] }),
  component: HomePage,
});

function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api.getMyProfile(),
  });

  const name = data?.profile.name ?? "there";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long" });

  return (
    <>
      <div className="ss-ph">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="ss-logo">S&amp;S</div>
          <button
            className="ss-btn ss-btn-outline"
            style={{ width: 38, height: 38, padding: 0, borderRadius: 999 }}
            aria-label="Notifications"
          >
            <Bell size={16} />
          </button>
        </div>
        <div className="ss-ph-row">
          <div>
            <div className="ss-ph-label">Dashboard</div>
            <h1 className="ss-ph-title">
              {isLoading ? "Loading…" : `Hey, ${name.split(" ")[0]}`}
            </h1>
            <div className="ss-ph-sub">{today} · 0 sessions this week</div>
          </div>
        </div>
      </div>

      <div className="ss-body">
        <div className="ss-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="ss-mono" style={{ fontSize: "0.65rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase" }}>
            Today's focus
          </span>
          <div className="ss-display" style={{ fontSize: "1.4rem", fontWeight: 800 }}>
            Set your first goal
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--color-muted-foreground)" }}>
            Once you fill out your profile, we'll start recommending study buddies and sessions.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          <Stat num="0" label="Sessions" accent />
          <Stat num="0h" label="Focus time" accent />
          <Stat num="0" label="Buddies" />
          <Stat num="0" label="Day streak" />
        </div>

        <div style={{ marginTop: 22 }}>
          <span className="ss-mono" style={{ fontSize: "0.7rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>
            Coming soon
          </span>
          <div className="ss-card" style={{ marginTop: 10 }}>
            <p style={{ fontSize: "0.85rem", color: "var(--color-muted-foreground)" }}>
              Match, Room, Schedule and Friends are wired up next. The bottom nav already routes to placeholder pages.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ num, label, accent }: { num: string; label: string; accent?: boolean }) {
  return (
    <div className="ss-card" style={{ padding: 14 }}>
      <div className="ss-display" style={{ fontSize: "1.4rem", fontWeight: 800, color: accent ? "var(--color-primary)" : "var(--color-foreground)" }}>
        {num}
      </div>
      <div className="ss-mono" style={{ fontSize: "0.65rem", letterSpacing: "0.06em", color: "var(--color-muted-foreground)", textTransform: "uppercase", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
