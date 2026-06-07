import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, Hash, Sparkles, Users } from "lucide-react";
import {
  useCommunity, useChannels, useChannelMessages, usePostChannel, useToggleJoin, useLiveChannel,
} from "../../lib/hooks/use-messaging";
import { useAuth } from "../../lib/auth-context";
import { useNetworkUser } from "../../lib/hooks/use-network";
import { MessageBubble } from "../../components/messaging/MessageBubble";
import { MessageComposer } from "../../components/messaging/MessageComposer";
import { timeAgo } from "../../components/messaging/Avatar";
import { API_BASE_URL } from "../../lib/api-client";

export const Route = createFileRoute("/_authenticated/communities_/$id/$channel")({
  head: () => ({ meta: [{ title: "Channel — Sync & Study" }] }),
  component: ChannelPage,
});

function ChannelMessageBubble({
  mine, text, authorId, showAuthor, showMeta, createdAt,
}: {
  mine: boolean; text: string; authorId: string; showAuthor: boolean; showMeta: boolean; createdAt: string;
}) {
  const { data: author } = useNetworkUser(mine ? "" : authorId);
  return (
    <MessageBubble
      mine={mine}
      text={text}
      authorLabel={showAuthor ? (author?.name ?? "Member") : undefined}
      meta={showMeta ? timeAgo(createdAt) : undefined}
    />
  );
}

function ChannelPage() {
  const { id, channel } = useParams({ from: "/_authenticated/communities_/$id/$channel" });
  const nav = useNavigate();
  const { user } = useAuth();
  const community = useCommunity(id);
  const channels = useChannels(id);
  const ch = useMemo(() => (channels.data ?? []).find((c) => c.name === channel), [channels.data, channel]);
  const messages = useChannelMessages(ch?.id);
  const post = usePostChannel();
  const join = useToggleJoin();
  const scrollRef = useRef<HTMLDivElement>(null);
  useLiveChannel(ch?.id);

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

  const joined = community.data.joined;

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
          const mine = String(m.authorId) === String(user?.id);
          const showAuthor = !mine && (i === 0 || arr[i - 1]?.authorId !== m.authorId);
          const showMeta = i === arr.length - 1 || arr[i + 1]?.authorId !== m.authorId;
          return (
            <div key={m.id}>
              <ChannelMessageBubble
                mine={mine}
                text={m.text}
                authorId={m.authorId}
                showAuthor={showAuthor}
                showMeta={showMeta}
                createdAt={m.createdAt}
              />
              {(m.attachments ?? []).map((att: any, idx: number) => (
                <a
                  key={idx}
                  href={`${API_BASE_URL}${att.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4, marginLeft: mine ? "auto" : 0,
                    marginRight: mine ? 0 : "auto", padding: "6px 10px", borderRadius: 8,
                    background: "var(--bg-3)", border: "1px solid var(--color-border)",
                    fontSize: "0.72rem", color: "var(--color-primary)", textDecoration: "none",
                    maxWidth: "80%",
                  }}
                >
                  📎 {att.name}
                </a>
              ))}
            </div>
          );
        })}
      </div>

      <button
        className="ss-btn ss-btn-ghost"
        style={{ margin: "0 16px 6px", borderTop: "1px solid var(--color-border)", padding: "8px 12px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", color: "var(--color-primary)" }}
        onClick={() => nav({ to: "/sage", search: { prompt: `Catch me up on the last 50 messages in #${ch.name} (${community.data!.name})` } as any })}
      >
        <Sparkles size={12} /> Catch me up on this channel
      </button>

      {joined ? (
        <MessageComposer
          placeholder={`Message #${ch.name}`}
          channelId={ch.id}
          onSend={(text, attachments) => post.mutate({ channelId: ch.id, text, attachments })}
        />
      ) : (
        <div style={{
          padding: "14px 16px", borderTop: "1px solid var(--color-border)",
          background: "var(--bg-2)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <span style={{ flex: 1, fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}>
            Join {community.data.name} to post in this channel.
          </span>
          <button
            className="ss-btn ss-btn-primary"
            style={{ padding: "8px 14px", fontSize: "0.78rem" }}
            onClick={() => join.mutate(community.data!.id)}
          >
            Join
          </button>
        </div>
      )}
    </>
  );
}
