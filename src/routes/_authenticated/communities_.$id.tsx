import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ChevronLeft, Hash, Pin, Users, Sparkles } from "lucide-react";
import { useCommunity, useChannels, useToggleJoin } from "../../lib/hooks/use-messaging";

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
              <div className="ss-mono" style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Users size={11} /> {c.members.toLocaleString()} MEMBERS
              </div>
            </div>
          </div>
          <p style={{ color: "var(--color-muted-foreground)", fontSize: "0.85rem", lineHeight: 1.5, marginTop: 12 }}>
            {c.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {c.tags.map((t) => <span key={t} className="ss-chip" style={{ fontSize: "0.65rem" }}>{t}</span>)}
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
