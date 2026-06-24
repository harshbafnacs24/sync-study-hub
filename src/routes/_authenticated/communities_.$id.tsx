import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft, Hash, Pin, Users, Sparkles, Clock, FileText, Image, Download,
  Volume2, VolumeX, Send, Paperclip, Check, Shield, Trash2, ArrowUp, ArrowDown,
  X, BarChart2, Share2, AlertCircle, Bookmark, Compass
} from "lucide-react";
import {
  useCommunity, useChannels, useChannelMessages, usePostChannel, useToggleJoin,
  useCommunityMembers, useUpdateGroupMemberRole, useKickGroupMember, useVoteChannelPoll,
  useLiveChannel
} from "../../lib/hooks/use-messaging";
import { useNetworkUser } from "../../lib/hooks/use-network";
import { useAuth } from "../../lib/auth-context";
import { socketBus, SocketEvents } from "../../lib/socket";
import { api, BACKEND_URL, tokenStore } from "../../lib/api-client";
import { toast } from "sonner";
import { usePost } from "../../lib/hooks/use-posts";
import { FilePreviewModal } from "../../components/messaging/FilePreviewModal";

export const Route = createFileRoute("/_authenticated/communities_/$id")({
  head: () => ({ meta: [{ title: "Study Group — Sync & Study" }] }),
  component: GroupDetailPage,
});

type GroupTab = "chat" | "files" | "members";

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

function timeAgo(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

function GroupDetailPage() {
  const { id } = useParams({ from: "/_authenticated/communities_/$id" });
  const community = useCommunity(id);
  const channels = useChannels(id);
  const join = useToggleJoin();
  const nav = useNavigate();
  const { user: currentUser } = useAuth();
  const token = tokenStore.get();
  
  const [activeTab, setActiveTab] = useState<GroupTab>("chat");
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; kind: string } | null>(null);

  // Group mutations
  const updateRole = useUpdateGroupMemberRole();
  const kickMember = useKickGroupMember();
  const voteChannelPoll = useVoteChannelPoll();
  const postMessage = usePostChannel();
  const members = useCommunityMembers(id);

  // Set default active channel
  useEffect(() => {
    if (channels.data && channels.data.length > 0 && !activeChannelId) {
      setActiveChannelId(channels.data[0].id);
    }
  }, [channels.data, activeChannelId]);

  const activeChannel = (channels.data ?? []).find(c => c.id === activeChannelId);
  const messages = useChannelMessages(activeChannelId || undefined);

  // Live Socket updates for group channel
  useLiveChannel(activeChannelId || undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Composer state
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [sendAnnouncement, setSendAnnouncement] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll creation state
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.data?.length]);

  const c = community.data;
  if (!c) {
    return (
      <div className="ss-body" style={{ padding: 16 }}>
        <Link to="/discover" className="ss-btn ss-btn-ghost"><ChevronLeft size={14} /> Back</Link>
        <div style={{ marginTop: 16, color: "var(--color-muted-foreground)" }}>Group not found.</div>
      </div>
    );
  }

  // Find currentUser's role in the community
  const memberInfo = (members.data ?? []).find((m: any) => m.userId === currentUser?.id);
  const userRole = memberInfo?.role || "member";
  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  // Scan channel messages for shared files & gallery media
  const allMessages = messages.data ?? [];
  const sharedFiles = allMessages.flatMap((m: any) => 
    (m.attachments ?? []).map((att: any) => ({
      ...att,
      messageId: m.id,
      senderId: m.authorId,
      createdAt: m.createdAt
    }))
  );

  const sharedImages = sharedFiles.filter(f => 
    f.kind?.startsWith("image") || 
    f.name?.endsWith(".png") || f.name?.endsWith(".jpg") || f.name?.endsWith(".jpeg") || f.name?.endsWith(".gif")
  );

  const sharedDocs = sharedFiles.filter(f => 
    !f.kind?.startsWith("image") && 
    !f.name?.endsWith(".png") && !f.name?.endsWith(".jpg") && !f.name?.endsWith(".jpeg") && !f.name?.endsWith(".gif")
  );

  // Filter announcements from message stream
  const announcements = allMessages.filter((m: any) => m.isAnnouncement);

  const handlePostMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !activeChannelId) return;

    postMessage.mutate({
      channelId: activeChannelId,
      text: text.trim(),
      replyToMessageId: replyTo?.id || null,
      isAnnouncement: sendAnnouncement
    }, {
      onSuccess: () => {
        setText("");
        setReplyTo(null);
        setSendAnnouncement(false);
      },
      onError: () => toast.error("Failed to post message")
    });
  };

  const handleSendPoll = () => {
    if (!pollQuestion.trim() || !activeChannelId) {
      toast.error("Please fill in question");
      return;
    }
    const filled = pollOptions.filter(o => o.trim());
    if (filled.length < 2) {
      toast.error("Please add at least 2 options");
      return;
    }

    postMessage.mutate({
      channelId: activeChannelId,
      text: `📊 Poll: ${pollQuestion}`,
      poll: {
        question: pollQuestion.trim(),
        options: filled.map(o => o.trim())
      }
    }, {
      onSuccess: () => {
        setPollQuestion("");
        setPollOptions(["", ""]);
        setPollOpen(false);
        toast.success("Poll shared in group chat!");
      },
      onError: () => toast.error("Failed to send poll")
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId) return;
    setUploading(true);
    try {
      const { file: uploaded } = await api.uploadChannelFile(activeChannelId, file);
      const attachment = { url: uploaded.url, kind: uploaded.kind, name: uploaded.name, size: uploaded.size };
      
      postMessage.mutate({
        channelId: activeChannelId,
        text: `📎 Document Shared: ${uploaded.name}`,
        attachments: [attachment],
        replyToMessageId: replyTo?.id || null
      }, {
        onSuccess: () => {
          setReplyTo(null);
          toast.success("File shared successfully in group");
        }
      });
    } catch (err: any) {
      toast.error(err?.message ?? "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleShareInviteLink = () => {
    const inviteLink = `${window.location.origin}/discover`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied to clipboard!");
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRole.mutate({
      groupId: id,
      userId,
      role: newRole
    }, {
      onSuccess: () => toast.success("Member role updated"),
      onError: () => toast.error("Failed to update role")
    });
  };

  const handleKickMember = (userId: string) => {
    kickMember.mutate({
      groupId: id,
      userId
    }, {
      onSuccess: () => toast.success("Member kicked from group"),
      onError: () => toast.error("Failed to kick member")
    });
  };

  return (
    <>
      {/* HEADER SECTION */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Link to="/discover" className="ss-btn ss-btn-ghost" style={{ padding: 6 }}><ChevronLeft size={18} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ss-display" style={{ fontWeight: 800, fontSize: "1rem", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{c.name}</span>
            <span style={{ fontSize: "0.68rem", color: "var(--color-primary)", background: "rgba(232, 255, 71, 0.08)", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              {c.category}
            </span>
          </div>
        </div>
        <button 
          onClick={handleShareInviteLink}
          className="ss-btn ss-btn-outline" 
          style={{ fontSize: "0.65rem", padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}
        >
          <Share2 size={12} /> Share Invite
        </button>
      </div>

      {/* TABS SELECTOR */}
      <div style={{
        display: "flex", background: "rgba(255,255,255,0.02)",
        borderBottom: "1px solid var(--color-border)", padding: 4
      }}>
        {([
          { key: "chat", label: "Group Chat", count: 0 },
          { key: "files", label: "Files & Media", count: sharedFiles.length },
          { key: "members", label: "Members", count: members.data?.length ?? c.members }
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="ss-mono"
            style={{
              flex: 1, padding: "8px 0", fontSize: "0.65rem",
              textTransform: "uppercase", letterSpacing: "0.05em",
              border: "none", cursor: "pointer",
              background: "transparent",
              color: activeTab === key ? "var(--color-primary)" : "#666",
              fontWeight: activeTab === key ? "bold" : "normal",
              borderBottom: activeTab === key ? "2px solid var(--color-primary)" : "2px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            {label} {count > 0 ? `(${count})` : ""}
          </button>
        ))}
      </div>

      {/* BODY CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ==================== TAB 1: GROUP CHAT & ANN. ==================== */}
        {activeTab === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* Announcements Panel */}
            {announcements.length > 0 && (
              <div style={{
                background: "rgba(232, 255, 71, 0.03)", borderBottom: "1px solid rgba(232, 255, 71, 0.12)",
                padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Pin size={12} style={{ color: "var(--color-primary)" }} />
                  <span className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-primary)", fontWeight: "bold", textTransform: "uppercase" }}>Group Announcement</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#e0e0e0", fontStyle: "italic", lineHeight: 1.4 }}>
                  "{announcements[announcements.length - 1].text}"
                </p>
              </div>
            )}

            {/* Channels Sidebar List (Horizontal) */}
            {channels.data && channels.data.length > 1 && (
              <div style={{ display: "flex", gap: 6, padding: "8px 14px", borderBottom: "1px solid var(--color-border)", overflowX: "auto", scrollbarWidth: "none" }} className="hide-scrollbar">
                {channels.data.map((ch: any) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannelId(ch.id)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: "0.7rem", cursor: "pointer",
                      background: activeChannelId === ch.id ? "rgba(232, 255, 71, 0.08)" : "rgba(255,255,255,0.02)",
                      border: activeChannelId === ch.id ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                      color: activeChannelId === ch.id ? "var(--color-primary)" : "var(--color-muted-foreground)",
                      display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    <Hash size={10} /> {ch.name}
                  </button>
                ))}
              </div>
            )}

            {/* Messages Scroll Panel */}
            <div 
              ref={scrollRef} 
              style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
            >
              {allMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#555", padding: 40, fontSize: "0.82rem" }}>
                  This is the start of the study group chat. Post the first message!
                </div>
              ) : (
                allMessages.map((m: any, i: number, arr: any[]) => {
                  const mine = String(m.authorId) === String(currentUser?.id);
                  const showAuthor = !mine && (i === 0 || arr[i - 1]?.authorId !== m.authorId);
                  const showMeta = i === arr.length - 1 || arr[i + 1]?.authorId !== m.authorId;
                  
                  // Reply parent lookup
                  const parentMsg = m.replyToMessageId 
                    ? arr.find((msg: any) => msg.id === m.replyToMessageId)
                    : null;

                  return (
                    <div 
                      key={m.id}
                      style={{
                        display: "flex", flexDirection: "column",
                        alignItems: mine ? "flex-end" : "flex-start",
                        gap: 2
                      }}
                    >
                      {/* Author Label */}
                      {showAuthor && (
                        <div className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", marginLeft: 4, marginBottom: 2 }}>
                          {m.author?.name || "Group Member"}
                        </div>
                      )}

                      {/* Reply preview */}
                      {parentMsg && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,0.03)",
                          borderLeft: "2px solid var(--color-primary)", fontSize: "0.7rem",
                          color: "var(--color-muted-foreground)", maxWidth: "80%"
                        }}>
                          <span style={{ fontWeight: "bold" }}>Replying: </span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{parentMsg.text}</span>
                        </div>
                      )}

                      {/* Message Bubble box */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: "82%" }}>
                        {mine && (
                          <button 
                            onClick={() => setReplyTo(m)}
                            style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", padding: 4 }}
                          >
                            <ChevronLeft size={12} /> reply
                          </button>
                        )}

                        <div style={{ flex: 1 }}>
                          {!m.poll ? (
                            m.text.startsWith("[post:") && m.text.endsWith("]") ? (
                              <SharedPostPreview postId={m.text.slice(6, -1)} token={token} />
                            ) : (
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
                            )
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
                                      onClick={() => {
                                        if (activeChannelId) {
                                          voteChannelPoll.mutate({ channelId: activeChannelId, messageId: m.id, optionIndex: idx });
                                        }
                                      }}
                                      style={{
                                        position: "relative", padding: "6px 10px", borderRadius: 6,
                                        background: "rgba(255,255,255,0.02)", border: hasVoted ? "1px solid var(--color-primary)" : "1px solid rgba(255,255,255,0.06)",
                                        cursor: "pointer", overflow: "hidden", fontSize: "0.78rem"
                                      }}
                                    >
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

                          {/* Shared Attachments */}
                          {(m.attachments ?? []).map((att: any, idx: number) => {
                            const fileUrl = `${BACKEND_URL}${att.url}${token ? `?token=${token}` : ""}`;
                            if (att.kind === "image") {
                              return (
                                <div key={idx} style={{ marginTop: 6, borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", maxWidth: 160 }}>
                                  <button
                                    onClick={() => setPreviewFile({ url: att.url, name: att.name, kind: att.kind })}
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "block" }}
                                  >
                                    <img src={fileUrl} alt={att.name} style={{ maxHeight: 120, maxWidth: "100%", display: "block", objectFit: "cover" }} />
                                  </button>
                                </div>
                              );
                            }
                            if (att.kind === "video") {
                              return (
                                <div key={idx} style={{ marginTop: 6, borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", maxWidth: 200 }}>
                                  <button
                                    onClick={() => setPreviewFile({ url: att.url, name: att.name, kind: att.kind })}
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "block", textAlign: "left" }}
                                  >
                                    <div style={{ position: "relative" }}>
                                      <video src={fileUrl} style={{ maxHeight: 120, maxWidth: "100%", display: "block" }} />
                                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", color: "#fff", fontSize: "1.2rem" }}>▶</div>
                                    </div>
                                  </button>
                                </div>
                              );
                            }
                            return (
                              <button
                                key={idx}
                                onClick={() => setPreviewFile({ url: att.url, name: att.name, kind: att.kind })}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  marginTop: 4,
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  background: "var(--bg-3)",
                                  border: "1px solid var(--color-border)",
                                  fontSize: "0.72rem",
                                  color: "var(--color-primary)",
                                  textDecoration: "none",
                                  cursor: "pointer"
                                }}
                              >
                                📎 {att.name}
                              </button>
                            );
                          })}
                        </div>

                        {!mine && (
                          <button 
                            onClick={() => setReplyTo(m)}
                            style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", padding: 4 }}
                          >
                            reply
                          </button>
                        )}
                      </div>

                      {/* Meta */}
                      {showMeta && (
                        <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", marginTop: 2, padding: "0 4px" }}>
                          {timeAgo(m.createdAt)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Joint Study Plan Shortcuts */}
            <button
              className="ss-btn ss-btn-ghost"
              style={{ margin: "0 16px 6px", borderTop: "1px solid var(--color-border)", padding: "8px 12px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", color: "var(--color-primary)" }}
              onClick={() => nav({ to: "/focus", search: { groupId: c.id } as any })}
            >
              <Clock size={12} /> Open Group Pomodoro Session
            </button>

            {/* Message composer */}
            {c.joined ? (
              <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-2)", borderTop: "1px solid var(--color-border)" }}>
                
                {/* Reply preview info */}
                {replyTo && (
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "rgba(232, 255, 71, 0.04)", borderLeft: "3px solid var(--color-primary)",
                    padding: "6px 12px", fontSize: "0.75rem"
                  }}>
                    <div style={{ color: "var(--color-muted-foreground)" }}>
                      Replying: <strong>{replyTo.text}</strong>
                    </div>
                    <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Main Input Controls Form */}
                <form 
                  onSubmit={handlePostMessage}
                  style={{ display: "flex", gap: 8, padding: "10px 14px", alignItems: "center" }}
                >
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

                  <button
                    type="button"
                    onClick={() => setPollOpen(true)}
                    className="ss-btn ss-btn-outline"
                    style={{ padding: "0 8px", height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Create Poll"
                  >
                    <BarChart2 size={16} />
                  </button>

                  {isAdminOrOwner && (
                    <button
                      type="button"
                      onClick={() => setSendAnnouncement(a => !a)}
                      className="ss-btn ss-btn-outline"
                      style={{
                        padding: "0 8px", height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                        borderColor: sendAnnouncement ? "var(--color-primary)" : "var(--color-border)",
                        color: sendAnnouncement ? "var(--color-primary)" : "var(--color-muted-foreground)"
                      }}
                      title="Send as Announcement"
                    >
                      <Pin size={16} />
                    </button>
                  )}

                  <input
                    className="ss-input"
                    placeholder={uploading ? "Uploading document..." : sendAnnouncement ? "Type announcement..." : "Message group..."}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
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
            ) : (
              <div style={{
                padding: "14px 16px", borderTop: "1px solid var(--color-border)",
                background: "var(--bg-2)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0
              }}>
                <span style={{ flex: 1, fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}>
                  Join this study group to interact with other members and access files.
                </span>
                <button
                  className="ss-btn ss-btn-primary"
                  style={{ padding: "8px 14px", fontSize: "0.78rem" }}
                  onClick={() => join.mutate(c.id)}
                >
                  Join Group
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: FILES & MEDIA GALLERY ==================== */}
        {activeTab === "files" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Shared Documents Section */}
            <div>
              <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 10 }}>
                Shared Files &amp; Resources ({sharedDocs.length})
              </div>
              {sharedDocs.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 10, border: "1px dashed var(--color-border)", color: "var(--color-muted-foreground)", fontSize: "0.78rem" }}>
                  No documents shared in this group yet. Use the paperclip icon in chat to share study materials.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sharedDocs.map((doc: any, idx: number) => (
                    <div 
                      key={idx}
                      style={{
                        padding: 12, background: "var(--bg-2)", border: "1px solid var(--color-border)",
                        borderRadius: 10, display: "flex", alignItems: "center", gap: 12
                      }}
                    >
                      <FileText size={24} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>
                          {Math.round(doc.size / 1024)} KB · Shared {timeAgo(doc.createdAt)}
                        </div>
                      </div>
                      <a 
                        href={`${BACKEND_URL}${doc.url}${token ? `?token=${token}` : ""}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ss-btn ss-btn-outline" 
                        style={{ padding: 8, borderRadius: 8 }}
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Media Gallery Section */}
            <div>
              <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 10 }}>
                Media Gallery ({sharedImages.length})
              </div>
              {sharedImages.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 10, border: "1px dashed var(--color-border)", color: "var(--color-muted-foreground)", fontSize: "0.78rem" }}>
                  No photos or videos shared in this group yet.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {sharedImages.map((img: any, idx: number) => (
                    <a 
                      key={idx}
                      href={`${BACKEND_URL}${img.url}${token ? `?token=${token}` : ""}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        aspectRatio: "1/1", borderRadius: 10, overflow: "hidden",
                        border: "1px solid var(--color-border)", background: "#000", display: "block"
                      }}
                    >
                      <img src={`${BACKEND_URL}${img.url}${token ? `?token=${token}` : ""}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: MEMBERS & ROLE MANAGEMENT ==================== */}
        {activeTab === "members" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="ss-mono" style={{ fontSize: "0.68rem", fontWeight: 700, color: "#666", textTransform: "uppercase" }}>Group Roster</span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}>{members.data?.length ?? c.members} members joined</span>
            </div>

            {members.isLoading ? (
              <div style={{ textAlign: "center", color: "#555", padding: 20 }}>Loading members...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(members.data ?? []).map((m: any) => {
                  const isSelf = m.userId === currentUser?.id;
                  
                  // Roles hierarchy constraints: Owner can manage anyone. Admin can manage moderators/members.
                  // Cannot manage yourself.
                  const canManage = isAdminOrOwner && !isSelf && (
                    userRole === "owner" || (userRole === "admin" && m.role !== "owner" && m.role !== "admin")
                  );

                  return (
                    <div 
                      key={m.userId}
                      style={{
                        padding: 12, background: "var(--bg-2)", border: "1px solid var(--color-border)",
                        borderRadius: 12, display: "flex", alignItems: "center", gap: 12
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: avatarGradient(m.userId), display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: 800, color: "#0c0c0c", fontSize: "0.85rem"
                      }}>
                        {m.avatar && !m.avatar.startsWith("http") ? m.avatar : m.name.slice(0, 2).toUpperCase()}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff" }}>
                          {m.name} {isSelf && <span style={{ fontStyle: "italic", fontSize: "0.7rem", color: "var(--color-muted-foreground)" }}>(You)</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <span className="ss-mono" style={{
                            fontSize: "0.58rem", textTransform: "uppercase", padding: "1px 4px", borderRadius: 4,
                            background: m.role === "owner" || m.role === "admin" ? "rgba(232, 255, 71, 0.08)" : "rgba(255,255,255,0.03)",
                            color: m.role === "owner" || m.role === "admin" ? "var(--color-primary)" : "var(--color-muted-foreground)"
                          }}>
                            {m.role || "member"}
                          </span>
                        </div>
                      </div>

                      {/* Admin controls */}
                      {canManage && (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {/* Role toggles */}
                          {m.role === "member" && (
                            <button 
                              onClick={() => handleRoleChange(m.userId, "admin")}
                              className="ss-btn ss-btn-outline" 
                              style={{ fontSize: "0.62rem", padding: "4px 8px", borderRadius: 6 }}
                              title="Promote to Admin"
                            >
                              Make Admin
                            </button>
                          )}
                          {m.role === "admin" && (
                            <button 
                              onClick={() => handleRoleChange(m.userId, "member")}
                              className="ss-btn ss-btn-outline" 
                              style={{ fontSize: "0.62rem", padding: "4px 8px", borderRadius: 6 }}
                              title="Demote to Member"
                            >
                              Demote
                            </button>
                          )}

                          {/* Kick Button */}
                          <button 
                            onClick={() => handleKickMember(m.userId)}
                            className="ss-btn ss-btn-outline" 
                            style={{ padding: 6, borderRadius: 6, borderColor: "rgba(255, 107, 107, 0.3)", color: "#ff6b6b" }}
                            title="Kick from group"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Leave Group Action */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16, marginTop: 10 }}>
              <button 
                onClick={() => {
                  join.mutate(c.id, {
                    onSuccess: () => {
                      toast.success(`Left group ${c.name}`);
                      nav({ to: "/discover" });
                    }
                  });
                }}
                disabled={join.isPending}
                className="ss-btn ss-btn-outline" 
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, borderColor: "rgba(255, 107, 107, 0.2)", color: "#ff6b6b", fontSize: "0.8rem" }}
              >
                Leave Study Group
              </button>
            </div>
          </div>
        )}
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
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>Create a Group Poll</span>
              <button onClick={() => setPollOpen(false)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", fontWeight: "bold" }}>Question</label>
              <input
                className="ss-input"
                placeholder="What topic should we focus on?"
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
              Share Poll Card
            </button>
          </div>
        </div>
      )}

      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        token={token}
      />
    </>
  );
}

function SharedPostPreview({ postId, token }: { postId: string; token: string | null }) {
  const { data: post, isLoading, error } = usePost(postId);

  if (isLoading) {
    return (
      <div style={{ padding: "8px 12px", background: "var(--bg-3)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}>
        Loading post preview...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ padding: "8px 12px", background: "var(--bg-3)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: "0.75rem", color: "#ff6b6b" }}>
        Post not found or unavailable
      </div>
    );
  }

  const mediaSrc = post.mediaUrl
    ? (post.mediaUrl.startsWith("http") ? post.mediaUrl : `${BACKEND_URL}${post.mediaUrl}${token ? `?token=${token}` : ""}`)
    : null;

  return (
    <div style={{
      padding: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)",
      borderRadius: 12, width: 220, display: "flex", flexDirection: "column", gap: 6,
      textAlign: "left"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.55rem", fontWeight: "bold"
        }}>
          {post.author.avatar ?? post.author.name[0]}
        </div>
        <span style={{ fontWeight: "bold", fontSize: "0.72rem", color: "#fff" }}>{post.author.name}</span>
      </div>
      <p style={{ margin: 0, fontSize: "0.75rem", color: "#ccc", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {post.content}
      </p>
      {mediaSrc && (
        <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid var(--color-border)", background: "#000" }}>
          {post.mediaType === "video" ? (
            <div style={{ position: "relative", aspectRatio: "16/9" }}>
              <video src={mediaSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", fontSize: "0.9rem" }}>▶</div>
            </div>
          ) : (
            <img src={mediaSrc} alt="" style={{ width: "100%", maxHeight: 100, objectFit: "cover", display: "block" }} />
          )}
        </div>
      )}
    </div>
  );
}
