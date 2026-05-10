import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { PageHeader, Card, SectionHeader } from "../../components/ui-kit/Card";
import { useAuth } from "../../lib/auth-context";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Sync & Study" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" sub={user?.email} />
      <div className="ss-body">
        <SectionHeader eyebrow="Account" title="Profile" />
        <Card>
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Display name" value={user?.name ?? "Set in Profile"} />
        </Card>

        <SectionHeader eyebrow="Focus" title="Pomodoro defaults" />
        <Card>
          <Row label="Focus" value="25 min" />
          <Row label="Short break" value="5 min" />
          <Row label="Long break" value="15 min" />
        </Card>

        <SectionHeader eyebrow="AI" title="Sage" />
        <Card>
          <Row label="Model" value="Claude (default)" />
          <Row label="Context" value="Tasks · Sessions · Streak" />
        </Card>

        <button
          className="ss-btn ss-btn-danger"
          onClick={() => { logout(); navigate({ to: "/login" }); }}
          style={{ marginTop: 22, width: "100%" }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
      <span className="ss-mono" style={{ fontSize: "0.65rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "0.85rem", color: "var(--color-foreground)" }}>{value}</span>
    </div>
  );
}
