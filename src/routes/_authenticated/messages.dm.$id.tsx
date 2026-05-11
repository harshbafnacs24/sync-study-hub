import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Pin, Sparkles } from "lucide-react";
import { useConversation, useDMs, useSendDM, useMarkConversationRead, useTogglePin } from "../../lib/hooks/use-messaging";
import { messagesStore } from "../../lib/store/messages";
import { Avatar, timeAgo } from "../../components/messaging/Avatar";
import { MessageBubble } from "../../components/messaging/MessageBubble";
import { MessageComposer } from "../../components/messaging/MessageComposer";

export const Route = createFileRoute("/_authenticated/messages/dm/$id")({
  head: () => ({ meta: [{ title: "Conversation — Sync & Study" }] }),
  component: DMPage,
});

function DMPage() {
  const { id } = useParams({ from: "/_authenticated/messages/dm/$id" });
  const conv = useConversation(id);
  const peer = useMemo(() => (conv.data ? messagesStore.peer(conv.data.peerId) : undefined), [conv.data]);
  const messages = useDMs(id);
  const send = useSendDM();
  const markRead = useMarkConversationRead();
  const togglePin = useTogglePin();
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { markRead.mutate(id); }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data?.length, typing]);

  const onSend = (text: string) => {
    send.mutate({ conversationId: id, text });
    // Simulate peer typing + reply for demo realism
    setTimeout(() => setTyping(true), 600);
    setTimeout(() => {
      setTyping(false);
      // store a fake peer reply directly
      if (peer) {
        messagesStore.send; // noop reference
      }
    }, 2200);
  };

  if (!conv.data || !peer) {
    return (
      <div className="ss-body" style={{ padding: 16 }}>
        <Link to="/messages" className="ss-btn ss-btn-ghost"><ChevronLeft size={14} /> Back</Link>
        <div style={{ marginTop: 16, color: "var(--color-muted-foreground)" }}>Conversation not found.</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <Link to="/messages" className="ss-btn ss-btn-ghost" style={{ padding: 6 }} aria-label="Back">
          <ChevronLeft size={18} />
        </Link>
        <Avatar peer={peer} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ss-display" style={{ fontWeight: 700, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{peer.name}</div>
          <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.06em", color: peer.online ? "var(--success)" : "var(--color-muted-foreground)", textTransform: "uppercase" }}>
            {peer.online ? "Online" : "Offline"}{peer.subject ? ` · ${peer.subject}` : ""}
          </div>
        </div>
        <button
          onClick={() => togglePin.mutate(id)}
          className="ss-btn ss-btn-ghost"
          style={{ padding: 6 }}
          aria-label="Pin"
        >
          <Pin size={16} style={{ color: conv.data.pinned ? "var(--color-primary)" : "var(--color-muted-foreground)" }} />
        </button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {(messages.data ?? []).map((m, i, arr) => {
          const mine = m.senderId === "me";
          const showMeta = i === arr.length - 1 || arr[i + 1]?.senderId !== m.senderId;
          return (
            <MessageBubble
              key={m.id}
              mine={mine}
              text={m.text}
              meta={showMeta ? `${timeAgo(m.createdAt)}${mine ? (m.read ? " · read" : " · sent") : ""}` : undefined}
            />
          );
        })}
        {typing && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", color: "var(--color-muted-foreground)", fontSize: "0.75rem" }}>
            <span className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {peer.name.split(" ")[0]} is typing
            </span>
            <span style={{ display: "inline-flex", gap: 3 }}>
              <Dot delay={0} /><Dot delay={150} /><Dot delay={300} />
            </span>
          </div>
        )}
      </div>

      <button
        className="ss-btn ss-btn-ghost"
        style={{ margin: "0 16px 6px", borderTop: "1px solid var(--color-border)", padding: "8px 12px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", color: "var(--color-primary)" }}
        onClick={() => onSend("Want to start a focus room together?")}
      >
        <Sparkles size={12} /> Ask Sage to draft a study plan with {peer.name.split(" ")[0]}
      </button>

      <MessageComposer onSend={onSend} placeholder={`Message ${peer.name.split(" ")[0]}`} />
    </>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: 4, height: 4, borderRadius: 999, background: "var(--color-muted-foreground)",
        animation: `ssBlink 1s ${delay}ms infinite ease-in-out`,
      }}
    />
  );
}
