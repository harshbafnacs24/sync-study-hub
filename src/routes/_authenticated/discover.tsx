import { useState } from "react";
import { createFileRoute, Link } from '@tanstack/react-router'
import { Globe, UserPlus, Users, Search, CheckCircle, Clock, X, UserCheck, MessageSquare, Bell } from "lucide-react";
import { PageTransition } from "../../components/shell/PageTransition";
import {
  useSearchUsers,
  useForYouUsers,
  useConnections,
  useSendConnectionRequest,
  useAcceptConnectionRequest,
  useRemoveConnection,
  useConnectionStatus,
  useDiscoverUsers,
  useNetworkUser,
} from "../../lib/hooks/use-network";
import { networkStore, type NetworkUser, type Connection } from "../../lib/store/network";
import { useAuth } from "../../lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover People — Sync & Study" }] }),
  component: DiscoverPage,
});

type DiscoverTab = "search" | "foryou" | "network";

/* ─── Profile Card ──────────────────────────────────────────────────────── */

function ProfileCard({ user }: { user: any }) {
  const connStatus = useConnectionStatus(user.id);
  const send = useSendConnectionRequest();
  const remove = useRemoveConnection();
  const connections = useConnections();

  const handleConnect = () => {
    if (connStatus.status === "none") {
      send.mutate(user.id, {
        onSuccess: () => toast.success(`Connection request sent to ${user.name}`),
        onError: () => toast.error("Failed to send request"),
      });
    } else if (connStatus.status === "connected" && connStatus.connectionId) {
      remove.mutate(connStatus.connectionId, { onSuccess: () => toast.success("Connection removed") });
    }
  };

  return (
    <div style={{
      background: "rgba(20,20,20,0.8)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      transition: "border-color 0.2s",
    }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(232,255,71,0.2)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
    >
      {/* Header row */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Avatar */}
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: avatarGradient(user.id),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: "1rem", color: "#0c0c0c",
        }}>
          {user.initials}
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#f0f0f0" }}>{user.name}</div>
            {user.publicId && (
              <span style={{
                background: "rgba(232,255,71,0.1)",
                color: "var(--color-primary)",
                fontSize: "0.58rem",
                fontFamily: "var(--font-mono)",
                padding: "1px 5px",
                borderRadius: 4,
                border: "1px solid rgba(232,255,71,0.2)"
              }}>
                {user.publicId}
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
            @{user.handle}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#555", marginTop: 1 }}>
            {user.school} · {user.year}
          </div>
        </div>
        {/* Online dot */}
        {user.online && (
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#3ddc84", flexShrink: 0, marginTop: 4,
          }} />
        )}
      </div>

      {/* Bio */}
      <p style={{ fontSize: "0.78rem", color: "#999", margin: 0, lineHeight: 1.5 }}>
        {user.bio}
      </p>

      {/* Interest chips */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {user.interests?.slice(0, 3).map((i: string) => (
          <span key={i} style={{
            padding: "2px 8px", borderRadius: 999,
            fontSize: "0.62rem", fontFamily: "var(--font-mono)",
            background: "rgba(232,255,71,0.05)",
            border: "1px solid rgba(232,255,71,0.12)",
            color: "var(--color-primary)",
          }}>{i}</span>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>{user.studyStreak ?? 0}d</div>
          <div style={{ fontSize: "0.6rem", color: "#555", fontFamily: "var(--font-mono)" }}>STREAK</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>{user.totalHours ?? 0}h</div>
          <div style={{ fontSize: "0.6rem", color: "#555", fontFamily: "var(--font-mono)" }}>TOTAL</div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Actions */}
        <div style={{ display: "flex", gap: 6 }}>
          <Link
            to="/network/$userId"
            params={{ userId: user.id }}
            className="ss-btn ss-btn-outline"
            style={{ padding: "6px 10px", fontSize: "0.72rem", borderRadius: 8 }}
          >
            View
          </Link>
          <button
            onClick={handleConnect}
            disabled={send.isPending || remove.isPending || connStatus.status === "outgoing_pending" || connStatus.status === "blocked"}
            className={connStatus.status === "connected" ? "ss-btn ss-btn-outline" : "ss-btn ss-btn-primary"}
            style={{ padding: "6px 10px", fontSize: "0.72rem", borderRadius: 8 }}
          >
            {connStatus.status === "connected" ? <><UserCheck size={12} /> Connected</> :
             connStatus.status === "outgoing_pending" ? <><Clock size={12} /> Sent</> :
             connStatus.status === "incoming_pending" ? <><CheckCircle size={12} /> Accept</> :
             <><UserPlus size={12} /> Connect</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Resolved Network User Card ─────────────────────────────────────────── */

function ResolvedNetworkUserCard({ userId }: { userId: string }) {
  const { data: user, isLoading } = useNetworkUser(userId);
  if (isLoading || !user) return null;
  return <ProfileCard user={user} />;
}

/* ─── Pending Request Card ───────────────────────────────────────────────── */

function PendingRequestCard({ conn, onAcceptSuccess }: { conn: any; onAcceptSuccess: () => void }) {
  const accept = useAcceptConnectionRequest();
  const remove = useRemoveConnection();
  const { user: currentUser } = useAuth();
  
  const isIncoming = conn.toUserId === currentUser?.id;
  const targetUserId = isIncoming ? conn.fromUserId : conn.toUserId;
  const { data: targetUser, isLoading } = useNetworkUser(targetUserId);

  if (isLoading || !targetUser) return null;

  return (
    <div style={{
      background: "rgba(232,255,71,0.03)",
      border: "1px solid rgba(232,255,71,0.12)",
      borderRadius: 12,
      padding: 14,
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: avatarGradient(targetUser.id),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: "0.85rem", color: "#0c0c0c",
      }}>
        {targetUser.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f0f0f0" }}>{targetUser.name}</div>
        <div style={{ fontSize: "0.68rem", color: "#666" }}>
          {isIncoming ? "Wants to connect with you" : "Request sent · Pending"}
        </div>
      </div>
      {isIncoming ? (
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => accept.mutate(conn.id, {
              onSuccess: () => {
                toast.success(`Connected with ${targetUser.name}!`);
                onAcceptSuccess();
              },
            })}
            className="ss-btn ss-btn-primary"
            style={{ padding: "6px 10px", fontSize: "0.72rem", borderRadius: 8 }}
          >
            <CheckCircle size={12} /> Accept
          </button>
          <button
            onClick={() => remove.mutate(conn.id, { onSuccess: () => toast.success("Request declined") })}
            className="ss-btn ss-btn-outline"
            style={{ padding: "6px 10px", fontSize: "0.72rem", borderRadius: 8 }}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => remove.mutate(conn.id, { onSuccess: () => toast.success("Request withdrawn") })}
          className="ss-btn ss-btn-outline"
          style={{ padding: "6px 8px", fontSize: "0.72rem", borderRadius: 8 }}
        >
          <X size={12} /> Withdraw
        </button>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

function DiscoverPage() {
  const [tab, setTab] = useState<DiscoverTab>("search");
  const [query, setQuery] = useState("");
  const { user: currentUser } = useAuth();
  const connections = useConnections();

  const search = useSearchUsers(query);
  const forYou = useForYouUsers();

  const accepted = (connections.data ?? []).filter((c: any) => c.status === "accepted");
  const pending  = (connections.data ?? []).filter((c: any) => c.status === "pending");

  // Since we resolve user objects dynamically, we map through accepted connections
  // and render a sub-component that fetches the specific user details
  const connectedIds = accepted.map((c: any) =>
    c.fromUserId === currentUser?.id ? c.toUserId : c.fromUserId
  );

  return (
    <PageTransition>
      {/* Header */}
      <div className="ss-ph" style={{ paddingBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Globe size={18} style={{ color: "var(--color-primary)" }} />
            <div>
              <div className="ss-ph-label">GLOBAL NETWORK</div>
              <h1 className="ss-ph-title" style={{ fontSize: "1.3rem" }}>Discover People</h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to="/notifications"
              className="ss-btn ss-btn-outline"
              style={{ width: 38, height: 38, padding: 0, borderRadius: 999 }}
              aria-label="Notifications"
            >
              <Bell size={16} />
            </Link>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "#666", pointerEvents: "none",
          }} />
          <input
            className="ss-input"
            placeholder="Search by name, @handle, or interest..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setTab("search"); }}
            style={{ paddingLeft: 36, width: "100%" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 14, background: "rgba(255,255,255,0.03)", padding: 3, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
          {([
            { key: "search", label: "Discover" },
            { key: "foryou", label: "For You" },
            { key: "network", label: `Network ${accepted.length > 0 ? `(${accepted.length})` : ""}` },
          ] as { key: DiscoverTab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="ss-mono"
              style={{
                flex: 1, padding: "8px 4px", fontSize: "0.62rem",
                textTransform: "uppercase", letterSpacing: "0.05em",
                borderRadius: 6, border: "none", cursor: "pointer",
                background: tab === key ? "rgba(232,255,71,0.08)" : "transparent",
                color: tab === key ? "var(--color-primary)" : "#666",
                fontWeight: tab === key ? "bold" : "normal",
                transition: "all 0.15s ease",
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="ss-body" style={{ paddingBottom: 80 }}>

        {/* ─── SEARCH / DISCOVER TAB ─── */}
        {tab === "search" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {search.isLoading ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Searching…</div>
            ) : (search.data ?? []).length === 0 ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40, fontSize: "0.85rem" }}>
                {query ? `No results for "${query}"` : "Start typing to search for students"}
              </div>
            ) : (
              (search.data ?? []).map((u) => <ProfileCard key={u.id} user={u} />)
            )}
          </div>
        )}

        {/* ─── FOR YOU TAB ─── */}
        {tab === "foryou" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              padding: "10px 14px",
              background: "rgba(232,255,71,0.04)",
              border: "1px solid rgba(232,255,71,0.08)",
              borderRadius: 10,
              fontSize: "0.75rem",
              color: "#888",
              lineHeight: 1.5,
            }}>
              ✦ Recommendations based on your <span style={{ color: "var(--color-primary)" }}>study interests</span> and <span style={{ color: "var(--color-primary)" }}>school</span>.
            </div>
            {forYou.isLoading ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Loading…</div>
            ) : (forYou.data ?? []).length === 0 ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40, fontSize: "0.85rem" }}>
                Add subjects to your profile to get personalized recommendations.
              </div>
            ) : (
              (forYou.data ?? []).map((u) => <ProfileCard key={u.id} user={u} />)
            )}
          </div>
        )}

        {/* ─── MY NETWORK TAB ─── */}
        {tab === "network" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Pending requests */}
            {pending.length > 0 && (
              <div>
                <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 10 }}>
                  Pending ({pending.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pending.map((c) => (
                    <PendingRequestCard 
                      key={c.id} 
                      conn={c} 
                      onAcceptSuccess={() => connections.refetch()} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Connected */}
            <div>
              <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "#666", textTransform: "uppercase", marginBottom: 10 }}>
                Connections ({accepted.length})
              </div>
              {connectedIds.length === 0 ? (
                <div style={{
                  padding: 32, textAlign: "center", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 12
                }}>
                  <Users size={28} style={{ color: "#333", marginBottom: 10 }} />
                  <div style={{ fontSize: "0.85rem", color: "#555" }}>No connections yet</div>
                  <div style={{ fontSize: "0.75rem", color: "#444", marginTop: 4 }}>
                    Go to Discover or For You to connect with students.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {connectedIds.map((uid) => <ResolvedNetworkUserCard key={uid} userId={uid} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const AVATAR_COLORS = [
  "linear-gradient(135deg,#E8FF47,#c6e600)",
  "linear-gradient(135deg,#4a9eff,#2575ff)",
  "linear-gradient(135deg,#aa66ff,#7722ee)",
  "linear-gradient(135deg,#3ddc84,#00aa55)",
  "linear-gradient(135deg,#ff6b6b,#ee2244)",
  "linear-gradient(135deg,#ffb347,#ff7700)",
];

function avatarGradient(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
export { DiscoverPage };
