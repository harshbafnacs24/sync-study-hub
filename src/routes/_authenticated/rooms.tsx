import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { PageHeader, EmptyState, Card } from "../../components/ui-kit/Card";

export const Route = createFileRoute("/_authenticated/rooms")({
  head: () => ({ meta: [{ title: "Study Rooms — Sync & Study" }] }),
  component: RoomsPage,
});

function RoomsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Collaborate"
        title="Study Rooms"
        sub="Synchronized focus with peers"
        right={
          <button className="ss-btn ss-btn-primary" disabled style={{ padding: "8px 12px", fontSize: "0.78rem" }}>
            <Plus size={14} /> Create
          </button>
        }
      />
      <div className="ss-body">
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)" }}>
              <Users size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="ss-display" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Real-time rooms ship next</div>
              <div style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>
                Shared timer, live participants, and chat are wired up in Milestone 3.
              </div>
            </div>
          </div>
        </Card>
        <EmptyState
          title="No active rooms"
          description="When rooms launch, you'll see live sessions here and can join with one tap."
          action={<Link to="/focus" className="ss-btn ss-btn-outline" style={{ padding: "8px 14px", fontSize: "0.8rem" }}>Solo focus instead</Link>}
        />
      </div>
    </>
  );
}
