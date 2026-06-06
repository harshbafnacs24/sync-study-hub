import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Compass, Pin, Bell } from "lucide-react";
import { PageHeader, EmptyState } from "../../components/ui-kit/Card";
import {
  useConversations, useCommunities, useUnreadNotifications, useLiveInbox,
} from "../../lib/hooks/use-messaging";
import { messagesStore } from "../../lib/store/messages";
import { PageTransition } from "../../components/shell/PageTransition";
import { Avatar, UnreadBadge, timeAgo } from "../../components/messaging/Avatar";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — Sync & Study" }] }),
  component: MessagesPage,
});

type Tab = "dms" | "communities";

function MessagesPage() {
  const [tab, setTab] = useState<Tab>("dms");
  const [q, setQ] = useState("");
  const conversations = useConversations();
  const communities = useCommunities();
  const { data: unread = 0 } = useUnreadNotifications();
  useLiveInbox();

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Inbox"
        title="Messages"
        sub="Direct chats and joined communities"
        right={
          <Link
            to="/notifications"
            className="ss-btn ss-btn-ghost"
            style={{ padding: 8, position: "relative" }}
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span
                className="ss-mono"
                style={{
                  position: "absolute", top: 2, right: 2,
                  background: "var(--color-primary)", color: "var(--color-primary-foreground)",
                  borderRadius: 999, fontSize: "0.55rem", fontWeight: 700,
                  minWidth: 14, height: 14, padding: "0 4px",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        }
      />
      <div className="ss-body" style={{ padding: 0 }}>
        <div style={{ padding: "12px 16px 8px" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", top: 12, left: 12, color: "var(--color-muted-foreground)" }} />
            <input
              className="ss-input"
              placeholder={tab === "dms" ? "Search conversations" : "Search communities"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 12, padding: 4, background: "var(--bg-2)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
            <TabBtn active={tab === "dms"} onClick={() => setTab("dms")} label="Direct" count={conversations.data?.reduce((n, c) => n + c.unread, 0)} />
            <TabBtn active={tab === "communities"} onClick={() => setTab("communities")} label="Communities" count={communities.data?.filter((c) => c.joined).length} />
          </div>
        </div>

        <div style={{ padding: "4px 8px 80px" }}>
          {tab === "dms" ? (
            <DMList query={q} />
          ) : (
            <JoinedCommunities query={q} />
          )}
        </div>
      </div>
    </PageTransition>
  );
}

function TabBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className="ss-mono"
      style={{
        flex: 1, border: 0, borderRadius: 6,
        padding: "8px 10px", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase",
        background: active ? "var(--bg-4)" : "transparent",
        color: active ? "var(--color-foreground)" : "var(--color-muted-foreground)",
        cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      {label}
      {!!count && <span style={{ background: active ? "var(--color-primary)" : "var(--bg-3)", color: active ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)", borderRadius: 999, padding: "1px 6px", fontSize: "0.6rem" }}>{count}</span>}
    </button>
  );
}

function DMList({ query }: { query: string }) {
  const { data: convs = [] } = useConversations();
  const filtered = convs.filter((c) => {
    if (!query) return true;
    const peer = messagesStore.peer(c.peerId);
    return peer?.name.toLowerCase().includes(query.toLowerCase());
  });

  if (filtered.length === 0) {
    return <div style={{ padding: 16 }}><EmptyState title="No conversations" description="Direct messages with study partners will appear here." /></div>;
  }
  return (
    <div>
      {filtered.map((c) => {
        const peer = messagesStore.peer(c.peerId);
        if (!peer) return null;
        return (
          <Link
            key={c.id}
            to="/messages/dm/$id"
            params={{ id: c.id }}
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            <div style={{ display: "flex", gap: 12, padding: "10px 12px", borderRadius: 8, alignItems: "center" }}>
              <Avatar peer={peer} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    {c.pinned && <Pin size={11} style={{ color: "var(--color-primary)", flexShrink: 0 }} />}
                    <span className="ss-display" style={{ fontWeight: 700, fontSize: "0.92rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {peer.name}
                    </span>
                  </div>
                  <span className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)", flexShrink: 0 }}>{timeAgo(c.lastMessageAt)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                  <span style={{
                    fontSize: "0.78rem",
                    color: c.unread > 0 ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                    fontWeight: c.unread > 0 ? 600 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{c.lastPreview || "Say hi"}</span>
                  <UnreadBadge count={c.unread} />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function JoinedCommunities({ query }: { query: string }) {
  const { data: list = [] } = useCommunities();
  const joined = list.filter((c) => c.joined && (!query || c.name.toLowerCase().includes(query.toLowerCase())));

  return (
    <div>
      <Link to="/communities" style={{ textDecoration: "none" }}>
        <div className="ss-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, margin: "8px 8px 12px", borderColor: "oklch(0.96 0.21 110 / 0.35)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "oklch(0.96 0.21 110 / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", flexShrink: 0 }}>
            <Compass size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="ss-display" style={{ fontWeight: 700, fontSize: "0.9rem" }}>Explore communities</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>Find study circles by subject and goal</div>
          </div>
        </div>
      </Link>

      {joined.length === 0 ? (
        <div style={{ padding: 16 }}>
          <EmptyState title="No communities yet" description="Join a community to see its channels here." />
        </div>
      ) : (
        joined.map((c) => (
          <Link key={c.id} to="/communities/$id" params={{ id: c.id }} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", gap: 12, padding: "10px 12px", alignItems: "center" }}>
              <div className="ss-display" style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", fontWeight: 800 }}>{c.iconChar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ss-display" style={{ fontWeight: 700, fontSize: "0.9rem" }}>{c.name}</div>
                <div className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>
                  {c.members.toLocaleString()} MEMBERS · {c.category.toUpperCase()}
                </div>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
