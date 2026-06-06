import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CalendarPlus, Link2, Users, Trash2, ExternalLink } from "lucide-react";
import { PageTransition } from "../../components/shell/PageTransition";
import { useQuickMeets, useScheduleQuickMeet, useDeleteQuickMeet, useConnections, useDiscoverUsers } from "../../lib/hooks/use-network";
import { useAuth } from "../../lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quickmeet")({
  head: () => ({ meta: [{ title: "Quick Meet — Sync & Study" }] }),
  component: QuickMeetPage,
});

function QuickMeetPage() {
  const navigate = useNavigate();
  const connections = useConnections();
  const meets = useQuickMeets();
  const schedule = useScheduleQuickMeet();
  const deleteMeet = useDeleteQuickMeet();
  const { user: currentUser } = useAuth();

  const accepted = (connections.data ?? []).filter((c: any) => c.status === "accepted");
  const { data: discoverList } = useDiscoverUsers();

  const connectedUsers = accepted.map((c: any) => {
    const uid = c.fromUserId === currentUser?.id ? c.toUserId : c.fromUserId;
    return discoverList?.find(u => u.id === uid);
  }).filter(Boolean);

  const [form, setForm] = useState({
    invitedUserId: connectedUsers[0]?.id ?? "",
    title: "",
    link: "",
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  useEffect(() => {
    if (connectedUsers.length > 0 && !form.invitedUserId) {
      setForm((f) => ({ ...f, invitedUserId: connectedUsers[0]!.id }));
    }
  }, [connectedUsers.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.invitedUserId || !form.title.trim() || !form.link.trim()) return;
    schedule.mutate(
      { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() },
      {
        onSuccess: () => {
          toast.success("Study session scheduled!");
          setForm((f) => ({ ...f, title: "", link: "" }));
        },
        onError: () => toast.error("Failed to schedule session"),
      }
    );
  };

  return (
    <PageTransition>
      <div className="ss-ph" style={{ paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CalendarPlus size={18} style={{ color: "var(--color-primary)" }} />
          <div>
            <div className="ss-ph-label">COLLABORATION</div>
            <h1 className="ss-ph-title" style={{ fontSize: "1.3rem" }}>Quick Meet</h1>
          </div>
        </div>
        <p style={{ fontSize: "0.78rem", color: "#888", marginTop: 6, lineHeight: 1.5 }}>
          Schedule a study session with a connection. Share a Zoom, Google Meet, or Discord link.
        </p>
      </div>

      <div className="ss-body" style={{ paddingBottom: 80 }}>

        {/* ── Schedule Form ── */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Who to invite */}
          <div>
            <label style={{ fontSize: "0.72rem", color: "#888", display: "block", marginBottom: 6, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Invite a Connection
            </label>
            {connectedUsers.length === 0 ? (
              <div style={{
                padding: 16, border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 10,
                fontSize: "0.8rem", color: "#555", textAlign: "center",
              }}>
                No connections yet. <br />
                <span
                  onClick={() => navigate({ to: "/discover" })}
                  style={{ color: "var(--color-primary)", cursor: "pointer" }}
                >
                  Discover people →
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {connectedUsers.map((u) => u && (
                  <label
                    key={u.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px",
                      background: form.invitedUserId === u.id ? "rgba(232,255,71,0.06)" : "rgba(255,255,255,0.02)",
                      border: form.invitedUserId === u.id ? "1px solid rgba(232,255,71,0.2)" : "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 10, cursor: "pointer", transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="radio"
                      name="invitedUser"
                      value={u.id}
                      checked={form.invitedUserId === u.id}
                      onChange={() => setForm((f) => ({ ...f, invitedUserId: u.id }))}
                      style={{ accentColor: "var(--color-primary)" }}
                    />
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `linear-gradient(135deg,#E8FF47,#c6e600)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: "0.75rem", color: "#0c0c0c", flexShrink: 0,
                    }}>
                      {u.initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f0f0f0" }}>{u.name}</div>
                      <div style={{ fontSize: "0.68rem", color: "#666" }}>@{u.handle}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Session title */}
          <div>
            <label style={{ fontSize: "0.72rem", color: "#888", display: "block", marginBottom: 6, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Session Title
            </label>
            <input
              className="ss-input"
              placeholder="e.g. DSA review — Dynamic Programming"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          {/* Meeting link */}
          <div>
            <label style={{ fontSize: "0.72rem", color: "#888", display: "block", marginBottom: 6, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Meeting Link
            </label>
            <div style={{ position: "relative" }}>
              <Link2 size={14} style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "#555", pointerEvents: "none",
              }} />
              <input
                className="ss-input"
                style={{ paddingLeft: 34 }}
                placeholder="https://meet.google.com/... or discord.gg/..."
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                type="url"
                required
              />
            </div>
            <div style={{ fontSize: "0.65rem", color: "#555", marginTop: 4 }}>
              Google Meet, Zoom, Discord, or any video link.
            </div>
          </div>

          {/* Date + Time */}
          <div>
            <label style={{ fontSize: "0.72rem", color: "#888", display: "block", marginBottom: 6, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Date & Time
            </label>
            <input
              className="ss-input"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              required
            />
          </div>

          <button
            type="submit"
            className="ss-btn ss-btn-primary"
            disabled={schedule.isPending || connectedUsers.length === 0}
            style={{ justifyContent: "center", gap: 8, marginTop: 4 }}
          >
            <CalendarPlus size={15} />
            {schedule.isPending ? "Scheduling…" : "Schedule Session"}
          </button>
        </form>

        {/* ── Upcoming Sessions ── */}
        {(meets.data ?? []).length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "#666", textTransform: "uppercase", marginBottom: 12 }}>
              Upcoming Sessions ({meets.data!.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(meets.data ?? []).map((meet: any) => {
                const invitedUser = discoverList?.find(u => u.id === meet.invitedUserId);
                return (
                  <div key={meet.id} style={{
                    background: "rgba(20,20,20,0.8)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12, padding: 16,
                    display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f0f0f0" }}>{meet.title}</div>
                        <div style={{ fontSize: "0.7rem", color: "#666", marginTop: 2 }}>
                          with {invitedUser?.name ?? meet.invitedUserId}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMeet.mutate(meet.id, { onSuccess: () => toast.success("Session deleted") })}
                        style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ fontSize: "0.72rem", color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                      {new Date(meet.scheduledAt).toLocaleString(undefined, {
                        weekday: "short", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>

                    <a
                      href={meet.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ss-btn ss-btn-outline"
                      style={{ fontSize: "0.75rem", gap: 6, justifyContent: "center" }}
                    >
                      <ExternalLink size={13} /> Join Session
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
