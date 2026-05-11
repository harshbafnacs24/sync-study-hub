import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, Hash, Sparkles, Users } from "lucide-react";
import { useCommunity, useChannelMessages, usePostChannel } from "../../lib/hooks/use-messaging";
import { communitiesStore } from "../../lib/store/communities";
import { messagesStore } from "../../lib/store/messages";
import { MessageBubble } from "../../components/messaging/MessageBubble";
import { MessageComposer } from "../../components/messaging/MessageComposer";
import { timeAgo } from "../../components/messaging/Avatar";

export const Route = createFileRoute("/_authenticated/communities/$id/$channel")({
  head: () => ({ meta: [{ title: "Channel — Sync & Study" }] }),
  component: ChannelPage,
});

function ChannelPage() {
  const { id, channel } = useParams({ from: "/_authenticated/communities/$id/$channel" });
  const community = useCommunity(id);
  const ch = useMemo(() => communitiesStore.channelByName(id, channel), [id, channel]);
  const messages = useChannelMessages(ch?.id);
  const post = usePostChannel();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.data?.length]);

  if (!community.data || !ch) {
    return (
      <div className="ss-body" style={{ padding: 16 }}>
        <Link to="/communities" className="ss-btn ss-btn-ghost"><ChevronLeft size={14} /> Back</Link>
        <div style={{ marginTop: 16, color: "var(--color-muted-foreground)" }}>Channel not found.</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <Link to="/communities/$id" params={{ id }} className="ss-btn ss-btn-ghost" style={{ padding: 6 }}><ChevronLeft size={18} /></Link>
        <Hash size={16} style={{ color: "var(--color-muted-foreground)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ss-display" style={{ fontWeight: 700, fontSize: "0.95rem" }}>{ch.name}</div>
          <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
            {community.data.name}{ch.topic ? ` · ${ch.topic}` : ""}
          </div>
        </div>
        <button className="ss-btn ss-btn-ghost" style={{ padding: 6, color: "var(--color-muted-foreground)" }} aria-label="Members">
          <Users size={16} />
        </button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {(messages.data ?? []).map((m, i, arr) => {
          if (m.system) return <MessageBubble key={m.id} mine={false} text={m.text} system />;
          const mine = m.authorId === "me";
          const peer = mine ? null : messagesStore.peer(m.authorId);
          const showAuthor = !mine && (i === 0 || arr[i - 1]?.authorId !== m.authorId);
          const showMeta = i === arr.length - 1 || arr[i + 1]?.authorId !== m.authorId;
          return (
            <MessageBubble
              key={m.id}
              mine={mine}
              text={m.text}
              authorLabel={showAuthor ? peer?.name ?? "Member" : undefined}
              meta={showMeta ? timeAgo(m.createdAt) : undefined}
            />
          );
        })}
      </div>

      <button
        className="ss-btn ss-btn-ghost"
        style={{ margin: "0 16px 6px", borderTop: "1px solid var(--color-border)", padding: "8px 12px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", color: "var(--color-primary)" }}
        onClick={() => alert("Sage will summarize the last 50 messages (mock)")}
      >
        <Sparkles size={12} /> Catch me up on this channel
      </button>

      <MessageComposer
        placeholder={`Message #${ch.name}`}
        onSend={(text) => post.mutate({ channelId: ch.id, text })}
      />
    </>
  );
}
