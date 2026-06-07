import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  UserPlus, UserCheck, Clock, MessageSquare,
  Flag, ShieldOff, Globe, Flame, Timer, Star, X, CalendarPlus
} from "lucide-react";
import { PageTransition } from "../../components/shell/PageTransition";
import {
  useNetworkUser,
  useConnectionStatus,
  useSendConnectionRequest,
  useAcceptConnectionRequest,
  useRemoveConnection,
  useBlockUser,
  useReportUser,
  useConnections,
} from "../../lib/hooks/use-network";
import { useAuth } from "../../lib/auth-context";
import { useStartConversation } from "../../lib/hooks/use-messaging";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/network/$userId")({
  head: () => ({ meta: [{ title: "Profile — Sync & Study" }] }),
  component: NetworkUserProfile,
});

const AVATAR_COLORS = [
  "linear-gradient(135deg,#E8FF47,#c6e600)",
  "linear-gradient(135deg,#4a9eff,#2575ff)",
  "linear-gradient(135deg,#aa66ff,#7722ee)",
  "linear-gradient(135deg,#3ddc84,#00aa55)",
  "linear-gradient(135deg,#ff6b6b,#ee2244)",
  "linear-gradient(135deg,#ffb347,#ff7700)",
];
function avatarGradient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function NetworkUserProfile() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: user, isLoading } = useNetworkUser(userId);
  const connStatus = useConnectionStatus(userId);
  const connections = useConnections();

  const send    = useSendConnectionRequest();
  const accept  = useAcceptConnectionRequest();
  const remove  = useRemoveConnection();
  const block   = useBlockUser();
  const report  = useReportUser();
  const startConv = useStartConversation();

  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  if (isLoading) return (
    <div style={{ padding: 40, textAlign: "center", color: "#555" }}>Loading…</div>
  );
  if (!user) return (
    <div style={{ padding: 40, textAlign: "center", color: "#555" }}>User not found</div>
  );

  const handleConnect = () => {
    if (connStatus.status === "none") {
      send.mutate(userId, { onSuccess: () => toast.success("Connection request sent!") });
    } else if (connStatus.status === "incoming_pending" && connStatus.connectionId) {
      accept.mutate(connStatus.connectionId, {
        onSuccess: () => toast.success(`Connected with ${user.name}!`),
      });
    } else if (connStatus.status === "connected" && connStatus.connectionId) {
      remove.mutate(connStatus.connectionId, { onSuccess: () => toast.success("Connection removed") });
    } else if (connStatus.status === "outgoing_pending" && connStatus.connectionId) {
      remove.mutate(connStatus.connectionId, { onSuccess: () => toast.success("Request withdrawn") });
    }
  };

  const handleBlock = () => {
    block.mutate(userId, {
      onSuccess: () => {
        toast.success(`${user.name} has been blocked`);
        navigate({ to: "/discover" });
      },
    });
  };

  const handleReport = () => {
    if (!reportReason.trim()) return;
    report.mutate({ userId, category: "other", reason: reportReason }, {
      onSuccess: () => {
        toast.success("Report submitted. Thank you.");
        setShowReport(false);
        setReportReason("");
      },
    });
  };

  return (
    <PageTransition>
      {/* Back button */}
      <div className="ss-ph" style={{ paddingBottom: 0 }}>
        <button
          onClick={() => navigate({ to: "/discover" })}
          className="ss-btn ss-btn-ghost"
          style={{ padding: "6px 8px", fontSize: "0.75rem", marginBottom: 14 }}
        >
          ← Back to Discover
        </button>
      </div>

      <div className="ss-body" style={{ paddingBottom: 80 }}>

        {/* ── Profile Card ── */}
        <div style={{
          background: "rgba(20,20,20,0.9)",
          border: "1px solid rgba(232,255,71,0.12)",
          borderRadius: 18, padding: 22,
          position: "relative", overflow: "hidden",
        }}>
          {/* Online indicator */}
          {user.online && (
            <div style={{
              position: "absolute", top: 16, right: 16,
              display: "flex", alignItems: "center", gap: 5,
              fontSize: "0.62rem", color: "#3ddc84", fontFamily: "var(--font-mono)",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ddc84" }} />
              ONLINE
            </div>
          )}

          {/* Avatar + Name */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, flexShrink: 0,
              background: user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? "var(--bg-3)" : avatarGradient(user.id),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? "2.2rem" : "1.4rem",
              color: user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? "inherit" : "#0c0c0c",
              border: "1px solid var(--color-border)"
            }}>
              {user.avatar ? (
                (user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? (
                  <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
                ) : (
                  user.avatar
                )
              ) : (
                user.initials
              )}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#f0f0f0" }}>{user.name}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                @{user.handle}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#666", marginTop: 2 }}>
                {user.school}{user.branch ? ` · ${user.branch}` : ""} · {user.year}
              </div>
              {(user as any).mutualFriends > 0 && (
                <div style={{ fontSize: "0.68rem", color: "var(--color-primary)", marginTop: 4 }}>
                  {(user as any).mutualFriends} mutual friend{(user as any).mutualFriends !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          <p style={{ fontSize: "0.82rem", color: "#aaa", lineHeight: 1.6, marginBottom: 16 }}>
            {user.bio}
          </p>

          {/* Interests */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
            {user.interests?.map((i: string) => (
              <span key={i} style={{
                padding: "3px 10px", borderRadius: 999,
                fontSize: "0.65rem", fontFamily: "var(--font-mono)",
                background: "rgba(232,255,71,0.05)",
                border: "1px solid rgba(232,255,71,0.12)",
                color: "var(--color-primary)",
              }}>{i}</span>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {[
              { icon: Flame, value: `${user.studyStreak ?? 0}d`, label: "Streak", color: "#E8FF47" },
              { icon: Timer, value: `${user.totalHours ?? 0}h`, label: "Total Hours", color: "#4a9eff" },
            ].map(({ icon: Icon, value, label, color }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: 12, textAlign: "center",
              }}>
                <Icon size={16} style={{ color, marginBottom: 4 }} />
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>{value}</div>
                <div style={{ fontSize: "0.58rem", color: "#555", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleConnect}
              disabled={send.isPending || accept.isPending || remove.isPending}
              className={connStatus.status === "connected" ? "ss-btn ss-btn-outline" : "ss-btn ss-btn-primary"}
              style={{ flex: 1, justifyContent: "center", gap: 6 }}
            >
              {connStatus.status === "connected" ? <><UserCheck size={14} /> Connected</> :
               connStatus.status === "outgoing_pending" ? <><Clock size={14} /> Request Sent</> :
               connStatus.status === "incoming_pending" ? <><UserCheck size={14} /> Accept Request</> :
               <><UserPlus size={14} /> Connect</>}
            </button>

            {connStatus.status === "connected" && (
              <button
                disabled={startConv.isPending}
                onClick={() => {
                  startConv.mutate(userId, {
                    onSuccess: (c) => {
                      navigate({ to: "/messages/dm/$id", params: { id: c.id } });
                    },
                    onError: () => {
                      toast.error("Failed to open chat");
                    }
                  });
                }}
                className="ss-btn ss-btn-outline"
                style={{ flex: 1, justifyContent: "center", gap: 6 }}
              >
                <MessageSquare size={14} /> Message
              </button>
            )}

            {connStatus.status === "connected" && (
              <Link
                to="/quickmeet"
                search={{ with: userId } as any}
                className="ss-btn ss-btn-outline"
                style={{ padding: "10px 12px", justifyContent: "center" }}
              >
                <CalendarPlus size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* ── Safety Actions ── */}
        <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowReport(true)}
            className="ss-btn ss-btn-ghost"
            style={{ flex: 1, justifyContent: "center", gap: 6, fontSize: "0.75rem", color: "#ff6b6b" }}
          >
            <Flag size={13} /> Report
          </button>
          <button
            onClick={() => setShowBlockConfirm(true)}
            className="ss-btn ss-btn-ghost"
            style={{ flex: 1, justifyContent: "center", gap: 6, fontSize: "0.75rem", color: "#ff6b6b" }}
          >
            <ShieldOff size={13} /> Block
          </button>
        </div>
      </div>

      {/* ── Report Modal ── */}
      {showReport && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.9)", display: "flex",
          alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            background: "#111", borderTop: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px 18px 0 0", padding: 24, width: "100%", maxWidth: 480,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>Report {user.name}</h3>
              <button onClick={() => setShowReport(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <textarea
              className="ss-textarea"
              placeholder="Describe the issue (spam, harassment, impersonation...)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
              style={{ marginBottom: 12 }}
            />
            <button
              onClick={handleReport}
              disabled={!reportReason.trim() || report.isPending}
              className="ss-btn ss-btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Submit Report
            </button>
          </div>
        </div>
      )}

      {/* ── Block Confirm Modal ── */}
      {showBlockConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.9)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "#111", border: "1px solid rgba(255,69,69,0.2)",
            borderRadius: 16, padding: 24, maxWidth: 340, width: "100%", textAlign: "center",
          }}>
            <ShieldOff size={32} style={{ color: "#ff6b6b", marginBottom: 12 }} />
            <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#fff", marginBottom: 8 }}>Block {user.name}?</h3>
            <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: 20, lineHeight: 1.5 }}>
              They won't be able to find you or send you messages. You can unblock them later.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowBlockConfirm(false)} className="ss-btn ss-btn-outline" style={{ flex: 1, justifyContent: "center" }}>
                Cancel
              </button>
              <button
                onClick={handleBlock}
                disabled={block.isPending}
                style={{ flex: 1, background: "#ff6b6b22", border: "1px solid #ff6b6b44", color: "#ff6b6b", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600 }}
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
