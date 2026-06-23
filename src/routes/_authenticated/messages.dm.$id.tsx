import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft, Pin, Sparkles, X, PlusCircle, Trash2, Smile, MessageCircle, BarChart2, Paperclip, Send
} from "lucide-react";
import {
  useConversation, useDMs, useSendDM, useMarkConversationRead, useTogglePin, useLiveDM,
  useDeleteMessage, useReactToMessage, useVoteDMPoll
} from "../../lib/hooks/use-messaging";
import { useNetworkUser } from "../../lib/hooks/use-network";
import { socketBus, SocketEvents } from "../../lib/socket";
import { api, API_BASE_URL } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { toast } from "sonner";
import { timeAgo } from "../../components/messaging/Avatar";

export const Route = createFileRoute("/_authenticated/messages/dm/$id")({
  head: () => ({ meta: [{ title: "Conversation — Sync & Study" }] }),
  component: DMPage,
});

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function DMPage() {
  const { id } = useParams({ from: "/_authenticated/messages/dm/$id" });
  const nav = useNavigate();
  const { user: currentUser } = useAuth();
  const conv = useConversation(id);
  const { data: peer, isLoading: isPeerLoading } = useNetworkUser(conv.data?.peerId ?? "");
  
  const messages = useDMs(id);
  const send = useSendDM();
  const markRead = useMarkConversationRead();
  const togglePin = useTogglePin();
  const deleteMessage = useDeleteMessage();
  const reactToMessage = useReactToMessage();
  const voteDMPoll = useVoteDMPoll();
  
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Custom composer & features state
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll creation modal/overlay state
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  useLiveDM(id);

  // Join Room
  useEffect(() => {
    socketBus.emit("conversation:join", `conv:${id}`);
    return () => { socketBus.emit("conversation:leave", `conv:${id}`); };
  }, [id]);

  // Listen to Typing Events
  useEffect(() => {
    const offStart = socketBus.on(SocketEvents.TypingStart, (p: { userId: string; room: string }) => {
      if (p.room === `conv:${id}` && p.userId === conv.data?.peerId) setTyping(true);
    });
    const offStop = socketBus.on(SocketEvents.TypingStop, (p: { userId: string; room: string }) => {
      if (p.room === `conv:${id}` && p.userId === conv.data?.peerId) setTyping(false);
    });
    return () => { offStart(); offStop(); };
  }, [id, conv.data?.peerId]);

  // Mark Read
  useEffect(() => {
    markRead.mutate(id);
  }, [id]);

  // Scroll to Bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.data?.length, typing]);

  // Emit typing indicators when typing
  const handleTextChange = (val: string) => {
    setText(val);
    if (val.trim()) {
      socketBus.emit("typing:start", { userId: currentUser?.id, room: `conv:${id}` });
    } else {
      socketBus.emit("typing:stop", { userId: currentUser?.id, room: `conv:${id}` });
    }
  };

  // Submit Text/Attachments/Reply
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    send.mutate({
      conversationId: id,
      text: text.trim(),
      replyToMessageId: replyTo?.id || null
    }, {
      onSuccess: () => {
        setText("");
        setReplyTo(null);
        socketBus.emit("typing:stop", { userId: currentUser?.id, room: `conv:${id}` });
      },
      onError: () => toast.error("Failed to send message")
    });
  };

  // Submit Poll Message
  const handleSendPoll = () => {
    if (!pollQuestion.trim()) {
      toast.error("Please enter a question");
      return;
    }
    const filledOptions = pollOptions.filter(o => o.trim());
    if (filledOptions.length < 2) {
      toast.error("Please provide at least 2 options");
      return;
    }

    send.mutate({
      conversationId: id,
      text: `📊 Poll: ${pollQuestion}`,
      poll: {
        question: pollQuestion.trim(),
        options: filledOptions.map(o => o.trim())
      }
    }, {
      onSuccess: () => {
        setPollQuestion("");
        setPollOptions(["", ""]);
        setPollOpen(false);
        toast.success("Poll shared!");
      },
      onError: () => toast.error("Failed to send poll")
    });
  };

  // File Attachment Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file: uploaded } = await api.uploadChatFile(id, file);
      const attachment = { url: uploaded.url, kind: uploaded.kind, name: uploaded.name, size: uploaded.size };
      
      send.mutate({
        conversationId: id,
        text: `📎 Attachment: ${uploaded.name}`,
        attachments: [attachment],
        replyToMessageId: replyTo?.id || null
      }, {
        onSuccess: () => {
          setReplyTo(null);
          toast.success("File shared successfully");
        }
      });
    } catch (err: any) {
      toast.error(err?.message ?? "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!conv.data || !peer) {
    return (
      <div className="ss-body" style={{ padding: 16 }}>
        <Link to="/discover" className="ss-btn ss-btn-ghost"><ChevronLeft size={14} /> Back</Link>
        <div style={{ marginTop: 16, color: "var(--color-muted-foreground)" }}>Conversation not found.</div>
      </div>
    );
  }

  return (
    <>
      {/* Header bar */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <Link to="/discover" className="ss-btn ss-btn-ghost" style={{ padding: 6 }} aria-label="Back">
          <ChevronLeft size={18} />
        </Link>
        
        {/* Avatar */}
        <div style={{ position: "relative" }}>
          {peer.avatar && (peer.avatar.startsWith("http") || peer.avatar.startsWith("/") || peer.avatar.startsWith("data:")) ? (
            <img src={peer.avatar} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: avatarGradient(peer.id),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, color: "#0c0c0c", fontSize: "0.85rem"
            }}>
              {peer.avatar ?? peer.initials}
            </div>
          )}
          {peer.online && (
            <div style={{
              position: "absolute", bottom: -2, right: -2, width: 10, height: 10,
              borderRadius: "50%", background: "#3ddc84", border: "2px solid var(--bg-2)"
            }} />
          )}
        </div>

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
          <Pin size={16} style={{ color: conv.data.pinned ? "var(--color-primary)" : "var(--color-muted-foreground)" }} fill={conv.data.pinned ? "var(--color-primary)" : "none"} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div 
        ref={scrollRef} 
        style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}
      >
        {(messages.data ?? []).map((m: any) => {
          const mine = String(m.senderId) === String(currentUser?.id);
          
          // Reply parent message lookup
          const parentMessage = m.replyToMessageId 
            ? (messages.data ?? []).find((msg: any) => msg.id === m.replyToMessageId)
            : null;

          return (
            <div 
              key={m.id} 
              style={{
                display: "flex", flexDirection: "column",
                alignItems: mine ? "flex-end" : "flex-start",
                gap: 4, position: "relative"
              }}
            >
              {/* Reply Preview Above Bubble */}
              {parentMessage && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 8px", borderRadius: 8, background: "rgba(255,255,255,0.03)",
                  borderLeft: "2px solid var(--color-primary)", fontSize: "0.7rem",
                  color: "var(--color-muted-foreground)", maxWidth: "80%", marginBottom: -2
                }}>
                  <span style={{ fontWeight: "bold" }}>Replying: </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{parentMessage.text}</span>
                </div>
              )}

              {/* Message Bubble Box */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: "82%" }}>
                {mine && (
                  <div style={{ display: "flex", gap: 4, opacity: 0.7 }}>
                    <button 
                      onClick={() => setReplyTo(m)}
                      style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", padding: 4 }}
                      title="Reply"
                    >
                      <MessageCircle size={13} />
                    </button>
                    <button 
                      onClick={() => reactToMessage.mutate({ conversationId: id, messageId: m.id, emoji: "❤️" })}
                      style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", padding: 4 }}
                      title="React Love"
                    >
                      <Smile size={13} />
                    </button>
                    <button 
                      onClick={() => deleteMessage.mutate({ conversationId: id, messageId: m.id })}
                      style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", padding: 4 }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {/* Core Content */}
                <div style={{ flex: 1 }}>
                  {/* Standard text / attachment message */}
                  {!m.poll ? (
                    <div style={{
                      padding: "9px 13px", borderRadius: 12,
                      background: mine ? "var(--color-primary)" : "var(--bg-3)",
                      color: mine ? "var(--color-primary-foreground)" : "var(--color-foreground)",
                      fontSize: "0.86rem", lineHeight: 1.45,
                      border: mine ? "none" : "1px solid var(--color-border)",
                      borderTopRightRadius: mine ? 4 : 12,
                      borderTopLeftRadius: mine ? 12 : 4,
                      wordBreak: "break-word"
                    }}>
                      {m.text}
                    </div>
                  ) : (
                    // Voteable Poll Card
                    <div style={{
                      padding: "12px 14px", borderRadius: 12,
                      background: "rgba(20,20,20,0.9)", border: "1px solid rgba(232, 255, 71, 0.25)",
                      color: "#fff", width: 240, display: "flex", flexDirection: "column", gap: 10,
                      borderTopRightRadius: mine ? 4 : 12, borderTopLeftRadius: mine ? 12 : 4
                    }}>
                      <div style={{ fontWeight: "bold", fontSize: "0.85rem", color: "var(--color-primary)" }}>
                        📊 {m.poll.question}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {m.poll.options.map((opt: string, idx: number) => {
                          const votesList = m.poll.votes?.[idx] || [];
                          const totalVotes = Object.values(m.poll.votes ?? {}).reduce((acc: number, v: any) => acc + (v?.length ?? 0), 0) as number;
                          const pct = totalVotes > 0 ? Math.round((votesList.length / totalVotes) * 100) : 0;
                          const hasVoted = votesList.includes(currentUser?.id);

                          return (
                            <div 
                              key={idx}
                              onClick={() => voteDMPoll.mutate({ conversationId: id, messageId: m.id, optionIndex: idx })}
                              style={{
                                position: "relative", padding: "6px 10px", borderRadius: 6,
                                background: "rgba(255,255,255,0.02)", border: hasVoted ? "1px solid var(--color-primary)" : "1px solid rgba(255,255,255,0.06)",
                                cursor: "pointer", overflow: "hidden", fontSize: "0.78rem"
                              }}
                            >
                              {/* Background progress bar */}
                              <div style={{
                                position: "absolute", inset: 0, right: `${100 - pct}%`,
                                background: hasVoted ? "rgba(232, 255, 71, 0.08)" : "rgba(255,255,255,0.04)",
                                zIndex: 0, transition: "right 0.3s ease"
                              }} />
                              
                              <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: hasVoted ? "bold" : "normal" }}>{opt}</span>
                                <span className="ss-mono" style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)" }}>
                                  {votesList.length} ({pct}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Render Attachments */}
                  {(m.attachments ?? []).map((att: any, idx: number) => (
                    <a
                      key={idx}
                      href={`${API_BASE_URL}${att.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4,
                        padding: "6px 10px", borderRadius: 8,
                        background: "var(--bg-3)", border: "1px solid var(--color-border)",
                        fontSize: "0.72rem", color: "var(--color-primary)", textDecoration: "none"
                      }}
                    >
                      📎 {att.name}
                    </a>
                  ))}
                </div>

                {!mine && (
                  <div style={{ display: "flex", gap: 4, opacity: 0.7 }}>
                    <button 
                      onClick={() => reactToMessage.mutate({ conversationId: id, messageId: m.id, emoji: "👍" })}
                      style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", padding: 4 }}
                      title="React ThumbsUp"
                    >
                      👍
                    </button>
                    <button 
                      onClick={() => setReplyTo(m)}
                      style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", padding: 4 }}
                      title="Reply"
                    >
                      <MessageCircle size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Reactions list */}
              {m.reactions && Object.keys(m.reactions).length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 2, padding: "0 4px" }}>
                  {Object.entries(m.reactions).map(([emoji, voters]: [string, any]) => {
                    if (!voters || voters.length === 0) return null;
                    const hasReacted = voters.includes(currentUser?.id);
                    return (
                      <button
                        key={emoji}
                        onClick={() => reactToMessage.mutate({ conversationId: id, messageId: m.id, emoji })}
                        style={{
                          background: hasReacted ? "rgba(232, 255, 71, 0.08)" : "rgba(255,255,255,0.02)",
                          border: hasReacted ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                          borderRadius: 20, padding: "2px 6px", fontSize: "0.62rem", display: "flex", gap: 3,
                          alignItems: "center", cursor: "pointer", color: "#fff"
                        }}
                      >
                        <span>{emoji}</span>
                        <span className="ss-mono" style={{ fontWeight: "bold" }}>{voters.length}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Message metadata */}
              <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", marginTop: 1, padding: "0 4px" }}>
                {timeAgo(m.createdAt)}{mine ? (m.read ? " · read" : " · sent") : ""}
              </div>
            </div>
          );
        })}

        {/* Realtime Typing dots */}
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

      {/* Joint study plan prompt shortcut */}
      <button
        className="ss-btn ss-btn-ghost"
        style={{ margin: "0 16px 6px", borderTop: "1px solid var(--color-border)", padding: "8px 12px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", color: "var(--color-primary)" }}
        onClick={() => nav({ to: "/sage", search: { prompt: `Draft a 60-min joint study plan for me and ${peer.name.split(" ")[0]}` } as any })}
      >
        <Sparkles size={12} /> Ask Sage to draft a study plan with {peer.name.split(" ")[0]}
      </button>

      {/* Message Composer Footer Area */}
      <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-2)", borderTop: "1px solid var(--color-border)" }}>
        {/* Reply Preview */}
        {replyTo && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "rgba(232, 255, 71, 0.04)", borderLeft: "3px solid var(--color-primary)",
            padding: "6px 12px", fontSize: "0.75rem"
          }}>
            <div style={{ color: "var(--color-muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Replying to: <strong>{replyTo.text}</strong>
            </div>
            <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Message Input form */}
        <form 
          onSubmit={handleSendMessage}
          style={{ display: "flex", gap: 8, padding: "10px 14px", alignItems: "center" }}
        >
          {/* File Picker */}
          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileUpload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="ss-btn ss-btn-outline"
            style={{ padding: "0 8px", height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Attach file"
          >
            <Paperclip size={16} />
          </button>

          {/* Poll Creator */}
          <button
            type="button"
            onClick={() => setPollOpen(true)}
            className="ss-btn ss-btn-outline"
            style={{ padding: "0 8px", height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Send Poll"
          >
            <BarChart2 size={16} />
          </button>

          {/* Text Input */}
          <input
            className="ss-input"
            placeholder={uploading ? "Uploading file..." : `Message ${peer.name.split(" ")[0]}...`}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            disabled={uploading}
            style={{ flex: 1, height: 36 }}
          />

          <button
            type="submit"
            className="ss-btn ss-btn-primary"
            disabled={uploading || !text.trim()}
            style={{ padding: "0 12px", height: 36, borderRadius: 8 }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* ==================== CREATE POLL DIALOG ==================== */}
      {pollOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{
            background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 16,
            width: "100%", maxWidth: 360, padding: 18, display: "flex", flexDirection: "column", gap: 14
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>Create a Poll</span>
              <button onClick={() => setPollOpen(false)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", fontWeight: "bold" }}>Question</label>
              <input
                className="ss-input"
                placeholder="What should we study tonight?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>Options</label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    className="ss-input"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[idx] = e.target.value;
                      setPollOptions(next);
                    }}
                    style={{ flex: 1 }}
                  />
                  {pollOptions.length > 2 && (
                    <button 
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                      style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              
              <button 
                type="button"
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="ss-btn ss-btn-outline"
                style={{ fontSize: "0.7rem", padding: "4px 8px", alignSelf: "flex-start", borderRadius: 6 }}
              >
                + Add Option
              </button>
            </div>

            <button 
              onClick={handleSendPoll}
              className="ss-btn ss-btn-primary" 
              style={{ width: "100%", padding: "8px 0", borderRadius: 8, fontSize: "0.78rem" }}
            >
              Send Poll Card
            </button>
          </div>
        </div>
      )}
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
