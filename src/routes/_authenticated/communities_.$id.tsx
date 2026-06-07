import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Hash, Pin, Users, Sparkles, Clock } from "lucide-react";
import { useCommunity, useChannels, useToggleJoin, useCommunityMembers } from "../../lib/hooks/use-messaging";

export const Route = createFileRoute("/_authenticated/communities_/$id")({
  head: () => ({ meta: [{ title: "Community — Sync & Study" }] }),
  component: CommunityDetailPage,
});

function CommunityDetailPage() {
  const { id } = useParams({ from: "/_authenticated/communities_/$id" });
  const community = useCommunity(id);
  const channels = useChannels(id);
  const join = useToggleJoin();
  const nav = useNavigate();
  const [showMembers, setShowMembers] = useState(false);
  const members = useCommunityMembers(id);

  const c = community.data;
  if (!c) {
    return (
      <div className="ss-body" style={{ padding: 16 }}>
        <Link to="/communities" className="ss-btn ss-btn-ghost"><ChevronLeft size={14} /> Back</Link>
        <div style={{ marginTop: 16, color: "var(--color-muted-foreground)" }}>Community not found.</div>
      </div>
    );
  }

  const list = channels.data ?? [];
  const pinned = list.filter((ch) => ch.pinned);
  const others = list.filter((ch) => !ch.pinned);

  return (
    <>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Link to="/communities" className="ss-btn ss-btn-ghost" style={{ padding: 6 }}><ChevronLeft size={18} /></Link>
        <span className="ss-mono" style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>{c.category}</span>
      </div>
      <div className="ss-body" style={{ padding: 0 }}>
        <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="ss-display" style={{
              width: 60, height: 60, borderRadius: 14,
              background: "var(--bg-3)", border: "1px solid var(--color-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--color-primary)", fontWeight: 800, fontSize: "1.6rem", flexShrink: 0,
            }}>{c.iconChar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="ss-display" style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{c.name}</h2>
              <button 
                onClick={() => setShowMembers(true)}
                className="ss-mono" 
                style={{ 
                  background: "none", border: "none", cursor: "pointer", 
                  fontSize: "0.65rem", color: "var(--color-primary)", marginTop: 4, 
                  display: "inline-flex", alignItems: "center", gap: 6, padding: 0 
                }}
              >
                <Users size={11} /> {c.members.toLocaleString()} MEMBERS (VIEW ALL)
              </button>
            </div>
          </div>
          <p style={{ color: "var(--color-muted-foreground)", fontSize: "0.85rem", lineHeight: 1.5, marginTop: 12 }}>
            {c.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {(c.tags ?? []).map((t) => <span key={t} className="ss-chip" style={{ fontSize: "0.65rem" }}>{t}</span>)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              onClick={() => join.mutate(c.id)}
              className={`ss-btn ${c.joined ? "ss-btn-outline" : "ss-btn-primary"}`}
              style={{ flex: 1, padding: "10px 14px", fontSize: "0.85rem" }}
            >
              {c.joined ? "Leave community" : "Join community"}
            </button>
            <button
              className="ss-btn ss-btn-outline"
              style={{ padding: "10px 14px", fontSize: "0.85rem", color: "var(--color-primary)", borderColor: "oklch(0.96 0.21 110 / 0.35)" }}
              onClick={() => nav({ to: "/sage", search: { prompt: `Summarize recent activity in the ${c.name} community` } as any })}
              title="Ask Sage for a community summary"
            >
              <Sparkles size={14} />
            </button>
          </div>
        </div>

        {/* Community Pomodoro Timer widget */}
        {c.joined && (
          <div className="ss-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", margin: "12px 16px 4px", background: "rgba(200,255,0,0.04)", borderColor: "rgba(200,255,0,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Clock size={16} style={{ color: "var(--color-primary)" }} />
              <div>
                <div className="ss-display" style={{ fontWeight: 700, fontSize: "0.85rem" }}>Community Pomodoro Timer</div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", marginTop: 1 }}>Start a study focus session for {c.name}</div>
              </div>
            </div>
            <Link to="/focus" className="ss-btn ss-btn-primary" style={{ padding: "6px 12px", fontSize: "0.72rem" }}>
              Start Timer
            </Link>
          </div>
        )}

        <div style={{ padding: "16px 16px 80px" }}>
          {pinned.length > 0 && (
            <>
              <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase", margin: "4px 4px 8px" }}>Pinned</div>
              {pinned.map((ch) => (
                <ChannelRow key={ch.id} pinned name={ch.name} topic={ch.topic} unread={ch.unread} onClick={() => nav({ to: "/communities/$id/$channel", params: { id: c.id, channel: ch.name } })} />
              ))}
              <div style={{ height: 14 }} />
            </>
          )}
          <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase", margin: "4px 4px 8px" }}>Channels</div>
          {others.map((ch) => (
            <ChannelRow key={ch.id} name={ch.name} topic={ch.topic} unread={ch.unread} onClick={() => nav({ to: "/communities/$id/$channel", params: { id: c.id, channel: ch.name } })} />
          ))}
        </div>
      </div>

      {showMembers && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.85)", display: "flex", 
          justifyContent: "flex-end",
        }}>
          <div onClick={() => setShowMembers(false)} style={{ position: "absolute", inset: 0, zIndex: -1 }} />
          
          <div style={{
            width: "100%", maxWidth: 360,
            background: "#0a0a0a",
            borderLeft: "1px solid var(--color-border)",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-10px 0 40px rgba(0,0,0,0.8)",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: "#FFF" }}>Community Members</h3>
                <span className="ss-mono" style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)" }}>{c.name}</span>
              </div>
              <button 
                onClick={() => setShowMembers(false)}
                className="ss-btn ss-btn-ghost"
                style={{ fontSize: "0.82rem", padding: "6px 10px" }}
              >
                Close
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
              {members.isLoading ? (
                <div className="ss-mono" style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", padding: 12 }}>Loading members...</div>
              ) : members.data && members.data.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {members.data.map((m: any) => (
                    <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
                      {m.avatar ? (
                        (m.avatar.startsWith("http") || m.avatar.startsWith("/") || m.avatar.startsWith("data:")) ? (
                          <img
                            src={m.avatar}
                            alt=""
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              objectFit: "cover",
                              border: "1px solid var(--color-border)"
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid var(--color-border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.1rem",
                            lineHeight: 1,
                            userSelect: "none"
                          }}>
                            {m.avatar}
                          </div>
                        )
                      ) : (
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: "rgba(232, 255, 71, 0.06)",
                          border: "1px solid rgba(232, 255, 71, 0.2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--color-primary)", fontWeight: "bold", fontSize: "0.85rem"
                        }}>
                          {String(m.name || "S").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--color-muted-foreground)", display: "flex", alignItems: "center", gap: 6 }}>
                          {m.role === "admin" || m.role === "owner" ? (
                            <span className="ss-mono" style={{ color: "var(--color-primary)", fontSize: "0.6rem", textTransform: "uppercase", background: "rgba(232,255,71,0.08)", padding: "1px 4px", borderRadius: 4 }}>
                              {m.role}
                            </span>
                          ) : (
                            <span className="ss-mono" style={{ fontSize: "0.6rem", textTransform: "uppercase" }}>
                              {m.role ?? "member"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ss-mono" style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", padding: 12 }}>No members found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChannelRow({ name, topic, unread, pinned, onClick }: { name: string; topic?: string; unread?: number; pinned?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        background: "transparent", border: 0, color: "inherit",
        padding: "10px 8px", borderRadius: 8, cursor: "pointer", textAlign: "left",
      }}
    >
      {pinned ? <Pin size={14} style={{ color: "var(--color-primary)" }} /> : <Hash size={14} style={{ color: "var(--color-muted-foreground)" }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{name}</div>
        {topic && <div style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", marginTop: 1 }}>{topic}</div>}
      </div>
      {unread ? (
        <span className="ss-mono" style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)", borderRadius: 999, padding: "1px 7px", fontSize: "0.6rem", fontWeight: 700 }}>{unread}</span>
      ) : null}
    </button>
  );
}
