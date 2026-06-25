import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  Globe, UserPlus, Users, Search, CheckCircle, Clock, X, UserCheck, MessageSquare, Bell,
  Bookmark, Share2, Film, Plus, Sparkles, Pin, Check, Star, Settings, Shield,
  ChevronRight, AlertCircle, FileText, Heart, PlusCircle, Trash2, Edit2, Play,
  Send, Image, Video, Compass, Info, MessageCircle, HelpCircle
} from "lucide-react";
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
import {
  useConversations,
  useStartConversation,
  useCreateGroupChat,
  useTogglePin,
  useMarkConversationRead,
  useUnreadNotifications,
  useCommunities,
  useToggleJoin,
  useCreateCommunity
} from "../../lib/hooks/use-messaging";
import {
  useFeedPosts,
  useStories,
  useSavedPosts,
  useCreatePost,
  useToggleLike,
  useToggleSave,
  useToggleShare,
  useAddComment,
  usePostComments,
  useDeletePost,
  useUpdatePost
} from "../../lib/hooks/use-posts";
import { api, BACKEND_URL } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { toast } from "sonner";
import { socketBus, SocketEvents } from "../../lib/socket";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Friends & Social — Sync & Study" }] }),
  component: DiscoverPage,
});

type DiscoverTab = "feed" | "friends" | "messages" | "groups";

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

/* ─── Social Empty State ─────────────────────────────────────────────────── */
function SocialEmptyState({
  title,
  description,
  activeTab,
  setTab
}: {
  title: string;
  description: string;
  activeTab: DiscoverTab;
  setTab: (tab: DiscoverTab) => void;
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "40px 24px",
      background: "rgba(20,20,20,0.6)",
      backdropFilter: "blur(8px)",
      border: "1px dashed rgba(255,255,255,0.08)",
      borderRadius: 16,
      margin: "16px 0",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
    }}>
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" style={{ marginBottom: 16 }}>
        <circle cx="50" cy="50" r="42" fill="rgba(232, 255, 71, 0.03)" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="5 5" />
        <circle cx="38" cy="38" r="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
        <text x="38" y="42" fontSize="11" textAnchor="middle">🧑‍💻</text>
        <circle cx="62" cy="42" r="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
        <text x="62" y="46" fontSize="13" textAnchor="middle">👩‍🎓</text>
        <circle cx="48" cy="65" r="9" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
        <text x="48" y="69" fontSize="10" textAnchor="middle">👨‍🎓</text>
        <path d="M38 38 L62 42" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        <path d="M38 38 L48 65" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        <path d="M62 42 L48 65" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        <path d="M50 20 L52 24 L56 25 L52 26 L50 30 L48 26 L44 25 L48 24 Z" fill="var(--color-primary)" />
      </svg>
      <h3 style={{ margin: "0 0 8px 0", fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>{title}</h3>
      <p style={{ margin: "0 0 20px 0", fontSize: "0.8rem", color: "var(--color-muted-foreground)", maxWidth: 300, lineHeight: 1.4 }}>{description}</p>
      
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {activeTab !== "feed" && (
          <button onClick={() => setTab("feed")} className="ss-btn ss-btn-outline" style={{ fontSize: "0.72rem", padding: "6px 12px", borderRadius: 8 }}>
            Explore Feed
          </button>
        )}
        {activeTab !== "friends" && (
          <button onClick={() => setTab("friends")} className="ss-btn ss-btn-outline" style={{ fontSize: "0.72rem", padding: "6px 12px", borderRadius: 8 }}>
            Find Friends
          </button>
        )}
        {activeTab !== "messages" && (
          <button onClick={() => setTab("messages")} className="ss-btn ss-btn-outline" style={{ fontSize: "0.72rem", padding: "6px 12px", borderRadius: 8 }}>
            Start Chat
          </button>
        )}
        {activeTab !== "groups" && (
          <button onClick={() => setTab("groups")} className="ss-btn ss-btn-outline" style={{ fontSize: "0.72rem", padding: "6px 12px", borderRadius: 8 }}>
            Create Group
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Story Modal Viewer ─────────────────────────────────────────────────── */
interface StoryModalProps {
  stories: any[];
  onClose: () => void;
}

function StoryModal({ stories, onClose }: StoryModalProps) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const story = stories[index];

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (index < stories.length - 1) {
            setIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return p + 2.5; // Fills in 4 seconds
      });
    }, 100);

    return () => clearInterval(interval);
  }, [index, stories.length, onClose]);

  if (!story) return null;

  const mediaSrc = story.mediaUrl?.startsWith("http") ? story.mediaUrl : story.mediaUrl ? `${BACKEND_URL}${story.mediaUrl}` : "";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.96)", display: "flex", flexDirection: "column",
      justifyContent: "space-between", padding: 16
    }}>
      {/* Progress Bars */}
      <div>
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                width: i < index ? "100%" : i === index ? `${progress}%` : "0%",
                height: "100%",
                background: "#fff",
                transition: i === index ? "width 0.1s linear" : "none"
              }} />
            </div>
          ))}
        </div>
        {/* User Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", border: "1.5px solid #fff",
            background: avatarGradient(story.authorId), display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "0.85rem", color: "#0c0c0c"
          }}>
            {story.author.avatar && !story.author.avatar.startsWith("http") ? story.author.avatar : story.author.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>{story.author.name}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.68rem" }}>{timeAgo(story.createdAt)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", fontWeight: 300, cursor: "pointer", padding: "0 8px" }}>×</button>
        </div>
      </div>

      {/* Media Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", margin: "20px 0", overflow: "hidden" }}>
        {mediaSrc ? (
          story.mediaType === "video" ? (
            <video src={mediaSrc} autoPlay playsInline loop muted style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 12 }} />
          ) : (
            <img src={mediaSrc} alt="" style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 12, objectFit: "contain" }} />
          )
        ) : (
          <div style={{
            padding: 32, textAlign: "center", color: "#fff", fontSize: "1.1rem", fontStyle: "italic",
            background: "rgba(255,255,255,0.05)", borderRadius: 16, width: "80%", maxWidth: 300
          }}>
            "{story.content}"
          </div>
        )}
      </div>

      {/* Caption text */}
      {mediaSrc && story.content && (
        <div style={{
          background: "rgba(255,255,255,0.08)", backdropFilter: "blur(16px)",
          borderRadius: 14, padding: "12px 18px", marginBottom: 10,
          border: "1px solid rgba(255,255,255,0.12)", zIndex: 10
        }}>
          <p style={{ color: "#fff", fontSize: "0.82rem", margin: 0, lineHeight: 1.5, textAlign: "center" }}>
            {story.content}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Profile Card Component ─────────────────────────────────────────────── */
function ProfileCard({ user, onStartChat }: { user: any; onStartChat?: () => void }) {
  const connStatus = useConnectionStatus(user.id);
  const send = useSendConnectionRequest();
  const accept = useAcceptConnectionRequest();
  const remove = useRemoveConnection();
  const navigate = useNavigate();
  const startConv = useStartConversation();

  const handleConnect = () => {
    if (connStatus.status === "incoming_pending" && connStatus.connectionId) {
      accept.mutate(connStatus.connectionId, {
        onSuccess: () => toast.success(`Connected with ${user.name}!`),
        onError: () => toast.error("Failed to accept request"),
      });
    } else if (connStatus.status === "none") {
      send.mutate(user.id, {
        onSuccess: () => toast.success(`Connection request sent to ${user.name}`),
        onError: () => toast.error("Failed to send request"),
      });
    } else if (connStatus.status === "connected" && connStatus.connectionId) {
      remove.mutate(connStatus.connectionId, { onSuccess: () => toast.success("Connection removed") });
    } else if (connStatus.status === "outgoing_pending" && connStatus.connectionId) {
      remove.mutate(connStatus.connectionId, { onSuccess: () => toast.success("Request withdrawn") });
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
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? "var(--bg-3)" : avatarGradient(user.id),
          border: "1px solid var(--color-border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? "1.6rem" : "1rem",
          color: user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? "inherit" : "#0c0c0c",
        }}>
          {user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? user.avatar : user.initials}
        </div>
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
        {user.online && (
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#3ddc84", flexShrink: 0, marginTop: 4,
          }} />
        )}
      </div>

      <p style={{ fontSize: "0.78rem", color: "#999", margin: 0, lineHeight: 1.5 }}>
        {user.bio}
      </p>

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

      <div style={{ display: "flex", gap: 16, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
        {(user.mutualFriends ?? 0) > 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-primary)" }}>{user.mutualFriends}</div>
            <div style={{ fontSize: "0.6rem", color: "#555", fontFamily: "var(--font-mono)" }}>MUTUAL</div>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <Link
            to="/network/$userId"
            params={{ userId: user.id }}
            className="ss-btn ss-btn-outline"
            style={{ padding: "6px 10px", fontSize: "0.72rem", borderRadius: 8 }}
          >
            View
          </Link>
          {connStatus.status === "connected" ? (
            <button
              disabled={startConv.isPending}
              onClick={() => {
                startConv.mutate(user.id, {
                  onSuccess: (c) => {
                    if (onStartChat) onStartChat();
                    navigate({ to: "/messages/dm/$id", params: { id: c.id } });
                  },
                  onError: () => {
                    toast.error("Failed to open chat");
                  }
                });
              }}
              className="ss-btn ss-btn-primary"
              style={{ padding: "6px 10px", fontSize: "0.72rem", borderRadius: 8, display: "flex", gap: 4, alignItems: "center" }}
            >
              <MessageSquare size={12} /> Message
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={send.isPending || remove.isPending || connStatus.status === "outgoing_pending" || connStatus.status === "blocked"}
              className="ss-btn ss-btn-primary"
              style={{ padding: "6px 10px", fontSize: "0.72rem", borderRadius: 8 }}
            >
              {connStatus.status === "outgoing_pending" ? <><Clock size={12} /> Sent</> :
               connStatus.status === "incoming_pending" ? <><CheckCircle size={12} /> Accept</> :
               <><UserPlus size={12} /> Connect</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Resolved Network User Card ─────────────────────────────────────────── */
function ResolvedNetworkUserCard({ userId, onStartChat }: { userId: string; onStartChat?: () => void }) {
  const { data: user, isLoading } = useNetworkUser(userId);
  if (isLoading || !user) return null;
  return <ProfileCard user={user} onStartChat={onStartChat} />;
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

/* ─── Conversation Item ──────────────────────────────────────────────────── */
function ConversationItem({
  conversation,
  typing,
  onClick
}: {
  conversation: any;
  typing: boolean;
  onClick: () => void;
}) {
  const { user: currentUser } = useAuth();
  const markRead = useMarkConversationRead();
  const togglePin = useTogglePin();

  if (!conversation.isGroup) {
    const { data: peer, isLoading } = useNetworkUser(conversation.peerId ?? "");
    if (isLoading) return <div style={{ height: 68, background: "rgba(255,255,255,0.02)", borderRadius: 12 }} />;
    if (!peer) return null;

    return (
      <div
        onClick={() => {
          if (conversation.unread > 0) markRead.mutate(conversation.id);
          onClick();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 14,
          background: "var(--bg-2)",
          border: conversation.pinned ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          position: "relative"
        }}
      >
        <div style={{ position: "relative" }}>
          {peer.avatar && (peer.avatar.startsWith("http") || peer.avatar.startsWith("/") || peer.avatar.startsWith("data:")) ? (
            <img src={peer.avatar} alt="" style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: avatarGradient(peer.id),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, color: "#0c0c0c", fontSize: "0.9rem"
            }}>
              {peer.avatar ?? peer.initials}
            </div>
          )}
          {peer.online && (
            <div style={{
              position: "absolute", bottom: -2, right: -2, width: 11, height: 11,
              borderRadius: "50%", background: "#3ddc84", border: "2px solid var(--bg-2)"
            }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff" }}>{peer.name}</span>
            <span className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)" }}>
              {timeAgo(conversation.lastMessageAt)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            {typing ? (
              <span style={{ fontSize: "0.78rem", color: "var(--color-primary)", fontWeight: "bold" }}>typing...</span>
            ) : (
              <p style={{
                margin: 0, fontSize: "0.78rem",
                color: conversation.unread > 0 ? "#fff" : "var(--color-muted-foreground)",
                fontWeight: conversation.unread > 0 ? 600 : 400,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1
              }}>
                {conversation.lastPreview}
              </p>
            )}
            {conversation.unread > 0 && (
              <span style={{
                background: "var(--color-primary)", color: "#0c0c0c", fontSize: "0.6rem", fontWeight: 800,
                borderRadius: 99, padding: "2px 6px", marginLeft: 8, flexShrink: 0
              }}>
                {conversation.unread}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); togglePin.mutate(conversation.id); }}
          style={{ background: "none", border: "none", color: conversation.pinned ? "var(--color-primary)" : "var(--color-muted-foreground)", cursor: "pointer", padding: 4 }}
        >
          <Pin size={12} fill={conversation.pinned ? "currentColor" : "none"} />
        </button>
      </div>
    );
  } else {
    // Group DM
    return (
      <div
        onClick={() => {
          if (conversation.unread > 0) markRead.mutate(conversation.id);
          onClick();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 14,
          background: "var(--bg-2)",
          border: conversation.pinned ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          position: "relative"
        }}
      >
        <div style={{ position: "relative" }}>
          {conversation.groupAvatar && (conversation.groupAvatar.startsWith("http") || conversation.groupAvatar.startsWith("/") || conversation.groupAvatar.startsWith("data:")) ? (
            <img src={conversation.groupAvatar} alt="" style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "linear-gradient(135deg, #aa66ff, #7722ee)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.2rem", fontWeight: 800, color: "#fff"
            }}>
              {conversation.groupAvatar || "👥"}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff" }}>{conversation.groupName}</span>
            <span className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)" }}>
              {timeAgo(conversation.lastMessageAt)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            {typing ? (
              <span style={{ fontSize: "0.78rem", color: "var(--color-primary)", fontWeight: "bold" }}>someone is typing...</span>
            ) : (
              <p style={{
                margin: 0, fontSize: "0.78rem",
                color: conversation.unread > 0 ? "#fff" : "var(--color-muted-foreground)",
                fontWeight: conversation.unread > 0 ? 600 : 400,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1
              }}>
                {conversation.lastPreview}
              </p>
            )}
            {conversation.unread > 0 && (
              <span style={{
                background: "var(--color-primary)", color: "#0c0c0c", fontSize: "0.6rem", fontWeight: 800,
                borderRadius: 99, padding: "2px 6px", marginLeft: 8, flexShrink: 0
              }}>
                {conversation.unread}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); togglePin.mutate(conversation.id); }}
          style={{ background: "none", border: "none", color: conversation.pinned ? "var(--color-primary)" : "var(--color-muted-foreground)", cursor: "pointer", padding: 4 }}
        >
          <Pin size={12} fill={conversation.pinned ? "currentColor" : "none"} />
        </button>
      </div>
    );
  }
}

/* ─── Suggested Friend Card (Friends Tab) ────────────────────────────────── */
function SuggestedFriendCard({ user, matchText }: { user: any; matchText: string }) {
  const connStatus = useConnectionStatus(user.id);
  const send = useSendConnectionRequest();

  const handleConnect = () => {
    if (connStatus.status === "none") {
      send.mutate(user.id, {
        onSuccess: () => toast.success(`Connection request sent to ${user.name}`),
        onError: () => toast.error("Failed to send request"),
      });
    }
  };

  return (
    <div style={{
      width: 140, flexShrink: 0, background: "var(--bg-2)", border: "1px solid var(--color-border)",
      borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", alignItems: "center",
      textAlign: "center", gap: 8, position: "relative"
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: "50%",
        background: user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? "var(--bg-3)" : avatarGradient(user.id),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? "1.6rem" : "1.1rem",
        border: "2px solid var(--color-border)", overflow: "hidden"
      }}>
        {user.avatar ? (
          (user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? (
            <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            user.avatar
          )
        ) : (
          user.initials
        )}
      </div>

      <div style={{ minWidth: 0, width: "100%" }}>
        <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.name}
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--color-primary)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          @{user.handle}
        </div>
        <div style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", marginTop: 4, height: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {matchText}
        </div>
      </div>

      <button
        onClick={handleConnect}
        disabled={send.isPending || connStatus.status === "outgoing_pending"}
        className="ss-btn ss-btn-primary"
        style={{ width: "100%", padding: "5px 0", fontSize: "0.68rem", borderRadius: 6, marginTop: 2 }}
      >
        {connStatus.status === "outgoing_pending" ? "Sent" : "Connect"}
      </button>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
function DiscoverPage() {
  const [tab, setTab] = useState<DiscoverTab>("feed");
  const [feedSubTab, setFeedSubTab] = useState<"posts" | "saved">("posts");
  const [query, setQuery] = useState("");
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // --- Network data ---
  const connections = useConnections();
  const search = useSearchUsers(query);
  const discover = useDiscoverUsers();
  const forYou = useForYouUsers();

  const accepted = (connections.data ?? []).filter((c: any) => c.status === "accepted");
  const pending  = (connections.data ?? []).filter((c: any) => c.status === "pending");
  const connectedIds = accepted.map((c: any) => c.fromUserId === currentUser?.id ? c.toUserId : c.fromUserId);

  const suggestedUsers = (forYou.data ?? []).filter((u: any) => {
    if (u.id === currentUser?.id) return false;
    const isConn = (connections.data ?? []).some((c: any) =>
      (c.fromUserId === currentUser?.id && c.toUserId === u.id) ||
      (c.fromUserId === u.id && c.toUserId === currentUser?.id)
    );
    return !isConn;
  });

  // --- Messaging Data & Socket Realtime Typing ---
  const conversations = useConversations();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotifications();
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const offStart = socketBus.on(SocketEvents.TypingStart, (p: { userId: string; room: string }) => {
      const convId = p.room?.replace("conv:", "");
      if (convId) setTypingUsers((prev) => ({ ...prev, [convId]: true }));
    });
    const offStop = socketBus.on(SocketEvents.TypingStop, (p: { userId: string; room: string }) => {
      const convId = p.room?.replace("conv:", "");
      if (convId) setTypingUsers((prev) => ({ ...prev, [convId]: false }));
    });
    return () => { offStart(); offStop(); };
  }, []);

  // --- Posts & Stories Data ---
  const feedPosts = useFeedPosts();
  const stories = useStories();
  const savedPosts = useSavedPosts();

  const createPost = useCreatePost();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const toggleLike = useToggleLike();
  const toggleSave = useToggleSave();
  const toggleShare = useToggleShare();
  const addComment = useAddComment();

  // Story modals & author stories grouping
  const [activeStoryGroup, setActiveStoryGroup] = useState<any[] | null>(null);
  
  const storiesByAuthor = (stories.data ?? []).reduce((acc: Record<string, any>, story: any) => {
    if (!story.author) return acc;
    const authorId = story.authorId;
    if (!acc[authorId]) {
      acc[authorId] = {
        author: story.author,
        items: []
      };
    }
    acc[authorId].items.push(story);
    return acc;
  }, {});
  const authorsWithStories = Object.values(storiesByAuthor);

  // --- Post Creator State ---
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorContent, setCreatorContent] = useState("");
  const [creatorType, setCreatorType] = useState<"post" | "story">("post");
  const [creatorMediaUrl, setCreatorMediaUrl] = useState<string | null>(null);
  const [creatorMediaType, setCreatorMediaType] = useState<"image" | "video" | "gif" | null>(null);
  const [creatorUploading, setCreatorUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = [
    { url: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=600&q=80", type: "image", label: "💻 Code" },
    { url: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80", type: "image", label: "☕ Coffee" },
    { url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80", type: "image", label: "📚 Books" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3BndmdmM283OHZpdHhvbTh0cnNscjR2OHU3bzY2dnN6aWRnbWNnayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/33OrjzUFwkwEg/giphy.gif", type: "gif", label: "🐱 Lofi" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmtlbjNuZnoxOHl6aThnZTR3cnR5bGVsbGlqZWV4ZXplMW13bzdhOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13HgwGsXF0aiGY/giphy.gif", type: "gif", label: "⚡ Matrix" }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreatorUploading(true);
    try {
      const { file: uploaded } = await api.uploadPostMedia(file);
      setCreatorMediaUrl(`${BACKEND_URL}${uploaded.url}`);
      setCreatorMediaType(uploaded.mediaType);
      toast.success(`${uploaded.mediaType} attached successfully!`);
    } catch (err: any) {
      toast.error(err?.message ?? "Media upload failed");
    } finally {
      setCreatorUploading(false);
    }
  };

  const handleSharePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorContent.trim() && !creatorMediaUrl) {
      toast.error("Please add some content or media");
      return;
    }
    


    createPost.mutate({
      content: creatorContent.trim(),
      mediaUrl: creatorMediaUrl || undefined,
      mediaType: creatorMediaType || undefined,
      type: creatorType
    }, {
      onSuccess: () => {
        setCreatorContent("");
        setCreatorMediaUrl(null);
        setCreatorMediaType(null);
        setCreatorOpen(false);
        toast.success(`${creatorType.toUpperCase()} shared!`);
      },
      onError: (err: any) => {
        toast.error(err?.message ?? "Failed to share update");
      }
    });
  };

  // --- Group DM Creator state ---
  const [groupCreatorOpen, setGroupCreatorOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("👥");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const createGroupChat = useCreateGroupChat();

  const handleCreateGroupChat = () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedParticipants.length === 0) {
      toast.error("Please select at least one friend");
      return;
    }
    createGroupChat.mutate({
      name: groupName.trim(),
      participants: selectedParticipants,
      avatar: groupAvatar
    }, {
      onSuccess: (newConv) => {
        setGroupName("");
        setSelectedParticipants([]);
        setGroupCreatorOpen(false);
        toast.success("Group chat created!");
        navigate({ to: "/messages/dm/$id", params: { id: newConv.id } });
      },
      onError: () => toast.error("Failed to create group chat")
    });
  };

  // --- Group/Community state ---
  const communities = useCommunities();
  const toggleJoinGroup = useToggleJoin();
  const createCommunity = useCreateCommunity();
  const [newGroupModalOpen, setNewGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("Study");
  const [newGroupTags, setNewGroupTags] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("📚");

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !newGroupDesc.trim()) {
      toast.error("Group name and description are required");
      return;
    }
    const tags = newGroupTags.split(",").map(t => t.trim()).filter(Boolean);
    createCommunity.mutate({
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      category: newGroupCategory,
      tags,
      iconChar: newGroupIcon
    }, {
      onSuccess: (newGroup) => {
        setNewGroupName("");
        setNewGroupDesc("");
        setNewGroupTags("");
        setNewGroupModalOpen(false);
        toast.success("Study group created!");
        navigate({ to: "/communities/$id", params: { id: newGroup.id } });
      },
      onError: () => toast.error("Failed to create group")
    });
  };

  // --- Comment Sheet state ---
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const commentsQuery = usePostComments(activeCommentPostId ?? "");

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeCommentPostId) return;
    addComment.mutate({
      postId: activeCommentPostId,
      content: newCommentText.trim()
    }, {
      onSuccess: () => {
        setNewCommentText("");
      }
    });
  };

  // --- Post Edit State ---
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");

  const handleUpdatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPostContent.trim() || !editPostId) return;
    updatePost.mutate({
      id: editPostId,
      content: editPostContent.trim()
    }, {
      onSuccess: () => {
        setEditPostId(null);
        toast.success("Post updated successfully!");
      },
      onError: () => toast.error("Failed to update post")
    });
  };

  return (
    <PageTransition>
      {/* HEADER SECTION */}
      <div className="ss-ph" style={{ paddingBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Globe size={18} style={{ color: "var(--color-primary)" }} />
            <div>
              <div className="ss-ph-label">FRIENDS &amp; SOCIAL</div>
              <h1 className="ss-ph-title" style={{ fontSize: "1.3rem" }}>Study Hub</h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to="/notifications"
              className="ss-btn ss-btn-outline"
              style={{ width: 38, height: 38, padding: 0, borderRadius: 999, position: "relative" }}
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadNotificationsCount > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 999,
                  background: "var(--color-primary)", color: "#0c0c0c", fontSize: "0.55rem", fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
                }}>
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Global tab navigator */}
        <div style={{
          display: "flex", gap: 4, background: "rgba(255,255,255,0.03)",
          padding: 3, borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)"
        }}>
          {([
            { key: "feed", label: "Feed" },
            { key: "friends", label: "Friends" },
            { key: "messages", label: "Messages" },
            { key: "groups", label: "Groups" }
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="ss-mono"
              style={{
                flex: 1, padding: "8px 4px", fontSize: "0.65rem",
                textTransform: "uppercase", letterSpacing: "0.05em",
                borderRadius: 8, border: "none", cursor: "pointer",
                background: tab === key ? "rgba(232,255,71,0.08)" : "transparent",
                color: tab === key ? "var(--color-primary)" : "#666",
                fontWeight: tab === key ? "bold" : "normal",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* CORE CONTENT LAYOUT */}
      <div className="ss-body" style={{ paddingBottom: 80, paddingTop: 10 }}>

        {/* ==================== 1. FEED TAB ==================== */}
        {tab === "feed" && (
          <div>
            {/* Horizontal sub-tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {([
                { key: "posts", label: "Posts", icon: Globe },
                { key: "saved", label: "Saved", icon: Bookmark }
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFeedSubTab(key)}
                  className="ss-btn"
                  style={{
                    flex: 1, fontSize: "0.75rem", padding: "6px 12px", borderRadius: 8,
                    background: feedSubTab === key ? "rgba(232, 255, 71, 0.08)" : "rgba(255,255,255,0.02)",
                    border: feedSubTab === key ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                    color: feedSubTab === key ? "var(--color-primary)" : "var(--color-muted-foreground)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontWeight: feedSubTab === key ? "bold" : "normal"
                  }}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            {/* A. POSTS SUB-TAB */}
            {feedSubTab === "posts" && (
              <div>
                {/* Instagram-style Stories bar */}
                <div style={{
                  display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, marginBottom: 16,
                  borderBottom: "1px solid var(--color-border)", scrollbarWidth: "none"
                }} className="hide-scrollbar">
                  {/* Create Story Button */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, gap: 4 }}>
                    <div 
                      onClick={() => { setCreatorType("story"); setCreatorOpen(true); }}
                      style={{
                        width: 58, height: 58, borderRadius: "50%", background: "var(--bg-3)",
                        border: "1px solid var(--color-border)", display: "flex", alignItems: "center",
                        justifyContent: "center", cursor: "pointer", position: "relative"
                      }}
                    >
                      {currentUser?.avatar && !currentUser.avatar.startsWith("http") ? (
                        <span style={{ fontSize: "1.5rem" }}>{currentUser.avatar}</span>
                      ) : (
                        <Users size={22} style={{ color: "var(--color-muted-foreground)" }} />
                      )}
                      <div style={{
                        position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: "50%",
                        background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center",
                        border: "2px solid var(--bg-1)", color: "#0c0c0c"
                      }}>
                        <Plus size={12} strokeWidth={3} />
                      </div>
                    </div>
                    <span style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)" }}>Your Story</span>
                  </div>

                  {/* Active Stories */}
                  {authorsWithStories.map((group: any) => (
                    <div 
                      key={group.author.id}
                      onClick={() => setActiveStoryGroup(group.items)}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, gap: 4, cursor: "pointer" }}
                    >
                      <div style={{
                        width: 58, height: 58, borderRadius: "50%",
                        background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                        padding: 2.5, display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <div style={{
                          width: "100%", height: "100%", borderRadius: "50%", background: "var(--bg-1)",
                          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
                        }}>
                          {group.author.avatar && !group.author.avatar.startsWith("http") ? (
                            <span style={{ fontSize: "1.4rem" }}>{group.author.avatar}</span>
                          ) : (
                            <div style={{
                              width: "100%", height: "100%", background: avatarGradient(group.author.id),
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: 800, color: "#0c0c0c", fontSize: "1.1rem"
                            }}>
                              {group.author.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.62rem", color: "#fff", width: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                        {group.author.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Inline Post Creator Button */}
                {!creatorOpen ? (
                  <div 
                    onClick={() => { setCreatorType("post"); setCreatorOpen(true); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: 14,
                      background: "var(--bg-2)", border: "1px solid var(--color-border)",
                      borderRadius: 16, marginBottom: 16, cursor: "pointer"
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: currentUser?.avatar && !currentUser.avatar.startsWith("http") ? "var(--bg-3)" : "var(--color-primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.2rem", color: "#0c0c0c"
                    }}>
                      {currentUser?.avatar && !currentUser.avatar.startsWith("http") ? currentUser.avatar : currentUser?.name?.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, color: "var(--color-muted-foreground)", fontSize: "0.78rem" }}>
                      Share a new update, story, or reel with friends...
                    </div>
                    <PlusCircle size={16} style={{ color: "var(--color-primary)" }} />
                  </div>
                ) : (
                  <div className="ss-card" style={{ padding: 16, background: "var(--bg-2)", borderRadius: 16, marginBottom: 16, border: "1px solid var(--color-border)" }}>
                    <form onSubmit={handleSharePost} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {(["post", "story"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setCreatorType(t);
                                setCreatorMediaType(null);
                                setCreatorMediaUrl(null);
                              }}
                              style={{
                                padding: "4px 8px", fontSize: "0.65rem", textTransform: "uppercase",
                                borderRadius: 6, border: "none", cursor: "pointer",
                                background: creatorType === t ? "var(--color-primary)" : "transparent",
                                color: creatorType === t ? "#0c0c0c" : "var(--color-muted-foreground)",
                                fontWeight: "bold"
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <button type="button" onClick={() => { setCreatorOpen(false); setCreatorMediaUrl(null); }} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", fontSize: "0.72rem" }}>Cancel</button>
                      </div>

                      <textarea
                        value={creatorContent}
                        onChange={(e) => setCreatorContent(e.target.value)}
                        placeholder={creatorType === "story" ? "Add story caption (optional)..." : "What are you studying today?"}
                        rows={3}
                        required={creatorType === "post" && !creatorMediaUrl}
                        style={{
                          width: "100%", background: "var(--bg-3)", border: "1px solid var(--color-border)",
                          borderRadius: 12, padding: 10, color: "#fff", fontSize: "0.8rem", resize: "none", outline: "none"
                        }}
                      />

                      {/* Display Selected Media Preview */}
                      {creatorMediaUrl && (
                        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border)" }}>
                          {creatorMediaType === "video" ? (
                            <video src={creatorMediaUrl} controls style={{ width: "100%", maxHeight: 200, objectFit: "cover" }} />
                          ) : (
                            <img src={creatorMediaUrl} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover" }} />
                          )}
                          <button type="button" onClick={() => { setCreatorMediaUrl(null); setCreatorMediaType(null); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer" }}>Remove</button>
                        </div>
                      )}

                      {/* Media Picker / Presets */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input 
                            ref={fileInputRef} 
                            type="file" 
                            accept="image/*,video/*,.gif" 
                            style={{ display: "none" }} 
                            onChange={handleFileUpload} 
                          />
                          <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={creatorUploading} 
                            className="ss-btn ss-btn-outline" 
                            style={{ padding: "6px 12px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <Image size={12} />
                            {creatorUploading ? "Uploading…" : "Attach Photo/Video"}
                          </button>
                        </div>

                        {true && (
                          <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
                            {presets.map((p) => (
                              <button
                                key={p.url}
                                type="button"
                                onClick={() => { setCreatorMediaUrl(p.url); setCreatorMediaType(p.type as any); }}
                                className="ss-btn ss-btn-outline"
                                style={{ padding: "4px 8px", fontSize: "0.65rem", borderColor: creatorMediaUrl === p.url ? "var(--color-primary)" : undefined }}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button type="submit" className="ss-btn ss-btn-primary" disabled={createPost.isPending || creatorUploading} style={{ width: "100%", padding: "8px 0", borderRadius: 8, fontSize: "0.78rem" }}>
                        Share to Feed
                      </button>
                    </form>
                  </div>
                )}

                {/* Feed Posts List */}
                {feedPosts.isLoading ? (
                  <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Loading feed…</div>
                ) : (feedPosts.data ?? []).length === 0 ? (
                  <SocialEmptyState 
                    title="Your Feed is Empty" 
                    description="Connect with friends or follow study recommendations to start seeing posts." 
                    activeTab="feed"
                    setTab={setTab}
                  />
                ) : (
                  (feedPosts.data ?? []).map((post: any) => {
                    const isOwner = currentUser?.id === post.authorId;
                    const mediaSrc = post.mediaUrl?.startsWith("http") ? post.mediaUrl : post.mediaUrl ? `${BACKEND_URL}${post.mediaUrl}` : null;
                    const isEditing = editPostId === post.id;

                    return (
                      <div 
                        key={post.id} 
                        className="ss-card ss-card-anim" 
                        style={{ padding: 0, overflow: "hidden", background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 16, marginBottom: 14 }}
                      >
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%",
                            background: avatarGradient(post.authorId), display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, color: "#0c0c0c", fontSize: "0.85rem"
                          }}>
                            {post.author.avatar && !post.author.avatar.startsWith("http") ? post.author.avatar : post.author.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff" }}>{post.author.name}</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--color-muted-foreground)" }}>
                              {post.author.school} · {timeAgo(post.createdAt)}
                            </div>
                          </div>
                          {isOwner && !isEditing && (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => { setEditPostId(post.id); setEditPostContent(post.content); }} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", fontSize: "0.7rem" }}>Edit</button>
                              <button
                                onClick={() => deletePost.mutate(post.id, { onSuccess: () => toast.success("Post deleted") })}
                                style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: "0.7rem" }}
                              >Delete</button>
                            </div>
                          )}
                        </div>

                        {/* Media display */}
                        {mediaSrc && (
                          <div style={{ width: "100%", background: "#060606", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
                            {post.mediaType === "video" ? (
                              <video src={mediaSrc} controls loop muted playsInline style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }} />
                            ) : (
                              <img src={mediaSrc} alt="Post media" style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }} />
                            )}
                          </div>
                        )}

                        {/* Caption/Content */}
                        {isEditing ? (
                          <form onSubmit={handleUpdatePost} style={{ padding: "0 14px 12px" }}>
                            <textarea
                              value={editPostContent}
                              onChange={(e) => setEditPostContent(e.target.value)}
                              rows={3}
                              style={{ width: "100%", background: "var(--bg-3)", border: "1px solid var(--color-border)", borderRadius: 8, padding: 8, color: "#fff", fontSize: "0.8rem", resize: "none" }}
                            />
                            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                              <button type="submit" className="ss-btn ss-btn-primary" style={{ padding: "4px 10px", fontSize: "0.72rem" }}>Save</button>
                              <button type="button" onClick={() => setEditPostId(null)} className="ss-btn ss-btn-outline" style={{ padding: "4px 10px", fontSize: "0.72rem" }}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <div style={{ padding: "12px 14px 8px 14px", fontSize: "0.82rem", lineHeight: 1.55, color: "#fff" }}>
                            {post.content}
                            {post.editedAt && <span style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", marginLeft: 6 }}>(edited)</span>}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 14px 10px" }}>
                          <div style={{ display: "flex", gap: 16 }}>
                            <button
                              onClick={() => toggleLike.mutate(post.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: post.liked ? "#ff4d6d" : "var(--color-muted-foreground)" }}
                            >
                              <Heart size={16} fill={post.liked ? "currentColor" : "none"} />
                              <span className="ss-mono" style={{ fontSize: "0.75rem", fontWeight: 700 }}>{post.likeCount}</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveCommentPostId(post.id);
                                setNewCommentText("");
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--color-muted-foreground)" }}
                            >
                              <MessageCircle size={16} />
                              <span className="ss-mono" style={{ fontSize: "0.75rem", fontWeight: 700 }}>{post.commentCount}</span>
                            </button>
                            <button
                              onClick={() => {
                                toggleShare.mutate(post.id);
                                toast.success("Shared post link!");
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)" }}
                            >
                              <Share2 size={16} />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => toggleSave.mutate(post.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: post.savedBy?.includes(currentUser?.id) ? "var(--color-primary)" : "var(--color-muted-foreground)" }}
                          >
                            <Bookmark size={16} fill={post.savedBy?.includes(currentUser?.id) ? "currentColor" : "none"} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}


            {/* C. SAVED SUB-TAB */}
            {feedSubTab === "saved" && (
              <div>
                {savedPosts.isLoading ? (
                  <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Loading saved posts…</div>
                ) : (savedPosts.data ?? []).length === 0 ? (
                  <SocialEmptyState 
                    title="No Saved Posts" 
                    description="Tap the bookmark icon on feed posts to save them for later." 
                    activeTab="feed"
                    setTab={setTab}
                  />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {(savedPosts.data ?? []).map((post: any) => {
                      const mediaSrc = post.mediaUrl?.startsWith("http") ? post.mediaUrl : post.mediaUrl ? `${BACKEND_URL}${post.mediaUrl}` : "";
                      return (
                        <div 
                          key={post.id}
                          onClick={() => {
                            setActiveCommentPostId(post.id);
                            setNewCommentText("");
                          }}
                          style={{
                            aspectRatio: "1/1", background: "var(--bg-2)", border: "1px solid var(--color-border)",
                            borderRadius: 10, overflow: "hidden", cursor: "pointer", position: "relative"
                          }}
                        >
                          {mediaSrc ? (
                            post.mediaType === "video" ? (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
                                <Film size={24} style={{ color: "var(--color-muted-foreground)" }} />
                              </div>
                            ) : (
                              <img src={mediaSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )
                          ) : (
                            <div style={{
                              padding: 6, fontSize: "0.65rem", color: "var(--color-muted-foreground)",
                              height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center"
                            }}>
                              "{post.content.slice(0, 20)}..."
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== 2. FRIENDS TAB ==================== */}
        {tab === "friends" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#666" }} />
              <input
                className="ss-input"
                placeholder="Search friends by name, @handle, or subject..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingLeft: 36, width: "100%" }}
              />
              {query && (
                <button onClick={() => setQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555" }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Friend Requests (Pending) */}
            {pending.length > 0 && !query && (
              <div>
                <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 10 }}>
                  Requests ({pending.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pending.map((c: any) => (
                    <PendingRequestCard 
                      key={c.id} 
                      conn={c} 
                      onAcceptSuccess={() => connections.refetch()} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Friends list (My Connections) */}
            {query.trim() === "" ? (
              <div>
                <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "#666", textTransform: "uppercase", marginBottom: 10 }}>
                  My Friends ({accepted.length})
                </div>
                {connectedIds.length === 0 ? (
                  <SocialEmptyState 
                    title="No Friends Yet" 
                    description="Connect with students from recommendations to expand your study network." 
                    activeTab="friends"
                    setTab={setTab}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {connectedIds.map((uid) => (
                      <ResolvedNetworkUserCard 
                        key={uid} 
                        userId={uid} 
                        onStartChat={() => setTab("messages")}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Search view
              <div>
                <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "#666", textTransform: "uppercase", marginBottom: 10 }}>
                  Search Results
                </div>
                {search.isLoading ? (
                  <div style={{ textAlign: "center", color: "#555", padding: 20 }}>Searching students...</div>
                ) : (search.data ?? []).length === 0 ? (
                  <div style={{ textAlign: "center", color: "#555", padding: 20, fontSize: "0.8rem" }}>
                    No students found matching "{query}"
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(search.data ?? []).map((u: any) => (
                      <ProfileCard key={u.id} user={u} onStartChat={() => setTab("messages")} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interest-based Suggestions list */}
            {!query && suggestedUsers.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span className="ss-mono" style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-primary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Suggested Study Buddies
                  </span>
                  <span style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)" }}>Matches subjects</span>
                </div>
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 10, scrollbarWidth: "none" }} className="hide-scrollbar">
                  {suggestedUsers.map((su: any) => {
                    const currentUserProfile = currentUser as any;
                    const common = su.interests?.filter((i: string) => currentUserProfile?.interests?.includes(i)) || [];
                    const matchText = common.length > 0
                      ? `Shared: ${common[0]}`
                      : su.school === currentUserProfile?.school
                        ? `Same School`
                        : `${su.year} · ${su.school}`;
                    return <SuggestedFriendCard key={su.id} user={su} matchText={matchText} />;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. MESSAGES TAB ==================== */}
        {tab === "messages" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Header / Actions row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, marginRight: 8 }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#666" }} />
                <input
                  className="ss-input"
                  placeholder="Search chats..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ paddingLeft: 36, width: "100%", height: 36 }}
                />
              </div>
              <button 
                onClick={() => setGroupCreatorOpen(true)}
                className="ss-btn ss-btn-primary"
                style={{ height: 36, fontSize: "0.72rem", padding: "0 12px", borderRadius: 8, flexShrink: 0 }}
              >
                New Group
              </button>
            </div>

            {/* Conversations list */}
            {conversations.isLoading ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Loading inbox…</div>
            ) : (conversations.data ?? []).length === 0 ? (
              <SocialEmptyState 
                title="Your Inbox is Empty" 
                description="Start a direct chat with a friend or create a study group to communicate in real time." 
                activeTab="messages"
                setTab={setTab}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(conversations.data ?? []).map((c: any) => (
                  <ConversationItem 
                    key={c.id} 
                    conversation={c} 
                    typing={!!typingUsers[c.id]}
                    onClick={() => navigate({ to: "/messages/dm/$id", params: { id: c.id } })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== 4. GROUPS TAB ==================== */}
        {tab === "groups" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Actions row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="ss-mono" style={{ fontSize: "0.68rem", fontWeight: 700, color: "#666", textTransform: "uppercase" }}>Study Circles &amp; Groups</span>
              <button 
                onClick={() => setNewGroupModalOpen(true)}
                className="ss-btn ss-btn-primary"
                style={{ fontSize: "0.72rem", padding: "6px 12px", borderRadius: 8 }}
              >
                Create Group
              </button>
            </div>

            {/* List Joined Groups */}
            <div>
              <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 10 }}>
                Joined Groups ({(communities.data ?? []).filter((g: any) => g.joined).length})
              </div>

              {(communities.data ?? []).filter((g: any) => g.joined).length === 0 ? (
                <SocialEmptyState 
                  title="No Joined Groups" 
                  description="Join a recommended study group or create your own circle to share announcements, files and polls." 
                  activeTab="groups"
                  setTab={setTab}
                />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  {(communities.data ?? []).filter((g: any) => g.joined).map((group: any) => (
                    <div 
                      key={group.id} 
                      onClick={() => navigate({ to: "/communities/$id", params: { id: group.id } })}
                      style={{
                        padding: 14, background: "var(--bg-2)", border: "1px solid var(--color-border)",
                        borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: "rgba(232, 255, 71, 0.05)", border: "1.5px solid var(--color-primary)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem"
                      }}>
                        {group.iconChar || "👥"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff" }}>{group.name}</span>
                          <span className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)" }}>
                            {group.members} members
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--color-muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {group.description}
                        </p>
                      </div>
                      <ChevronRight size={14} style={{ color: "var(--color-muted-foreground)" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List Suggested/Recommended Groups */}
            {(communities.data ?? []).filter((g: any) => !g.joined).length > 0 && (
              <div>
                <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "#666", textTransform: "uppercase", marginBottom: 10 }}>
                  Recommended for You
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  {(communities.data ?? []).filter((g: any) => !g.joined).map((group: any) => (
                    <div 
                      key={group.id}
                      style={{
                        padding: 14, background: "var(--bg-2)", border: "1px solid var(--color-border)",
                        borderRadius: 14, display: "flex", alignItems: "center", gap: 12
                      }}
                    >
                      <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem"
                      }}>
                        {group.iconChar || "👥"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff" }}>{group.name}</div>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--color-muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {group.description}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          toggleJoinGroup.mutate(group.id, {
                            onSuccess: () => toast.success(`Joined ${group.name}!`)
                          });
                        }}
                        disabled={toggleJoinGroup.isPending}
                        className="ss-btn ss-btn-primary" 
                        style={{ fontSize: "0.68rem", padding: "6px 12px", borderRadius: 8 }}
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== STORY LIGHTBOX DIALOG ==================== */}
      {activeStoryGroup && (
        <StoryModal 
          stories={activeStoryGroup} 
          onClose={() => setActiveStoryGroup(null)} 
        />
      )}

      {/* ==================== CREATE GROUP DM DIALOG ==================== */}
      {groupCreatorOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{
            background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 16,
            width: "100%", maxWidth: 360, padding: 18, display: "flex", flexDirection: "column", gap: 14
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>Create Group Chat</span>
              <button onClick={() => setGroupCreatorOpen(false)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", fontWeight: "bold" }}>Group Name</label>
              <input
                className="ss-input"
                placeholder="Study Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", fontWeight: "bold" }}>Group Icon / Emoji</label>
              <input
                className="ss-input"
                placeholder="👥"
                value={groupAvatar}
                onChange={(e) => setGroupAvatar(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", fontWeight: "bold" }}>Select Members ({selectedParticipants.length})</label>
              <div style={{
                maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6,
                border: "1px solid var(--color-border)", padding: 8, borderRadius: 8, background: "var(--bg-3)"
              }}>
                {accepted.map((c: any) => {
                  const friendId = c.fromUserId === currentUser?.id ? c.toUserId : c.fromUserId;
                  const { data: f } = useNetworkUser(friendId);
                  if (!f) return null;

                  const checked = selectedParticipants.includes(f.id);

                  return (
                    <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: 4 }}>
                      <input 
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setSelectedParticipants(p => p.filter(id => id !== f.id));
                          } else {
                            setSelectedParticipants(p => [...p, f.id]);
                          }
                        }}
                      />
                      <span style={{ fontSize: "0.78rem", color: "#fff" }}>{f.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleCreateGroupChat}
              disabled={createGroupChat.isPending}
              className="ss-btn ss-btn-primary" 
              style={{ width: "100%", padding: "8px 0", borderRadius: 8, fontSize: "0.78rem" }}
            >
              Create Chat Room
            </button>
          </div>
        </div>
      )}

      {/* ==================== CREATE GROUP/COMMUNITY DIALOG ==================== */}
      {newGroupModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{
            background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 16,
            width: "100%", maxWidth: 360, padding: 18, display: "flex", flexDirection: "column", gap: 14
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>New Study Group</span>
              <button onClick={() => setNewGroupModalOpen(false)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", fontWeight: "bold" }}>Group Name</label>
              <input
                className="ss-input"
                placeholder="Sync & Study Circle"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", fontWeight: "bold" }}>Description</label>
              <textarea
                className="ss-input"
                placeholder="What is this study circle about?"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                rows={2}
                style={{ width: "100%", resize: "none", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", fontWeight: "bold" }}>Category</label>
                <select 
                  className="ss-input"
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-3)" }}
                >
                  <option value="Study">Study</option>
                  <option value="Coding">Coding</option>
                  <option value="Exams">Exams</option>
                  <option value="Languages">Languages</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ width: 80 }}>
                <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", fontWeight: "bold" }}>Emoji Icon</label>
                <input
                  className="ss-input"
                  placeholder="📚"
                  value={newGroupIcon}
                  onChange={(e) => setNewGroupIcon(e.target.value)}
                  style={{ width: "100%", textAlign: "center" }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", fontWeight: "bold" }}>Tags (comma separated)</label>
              <input
                className="ss-input"
                placeholder="react, exams, cs101"
                value={newGroupTags}
                onChange={(e) => setNewGroupTags(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <button 
              onClick={handleCreateGroup}
              disabled={createCommunity.isPending}
              className="ss-btn ss-btn-primary" 
              style={{ width: "100%", padding: "8px 0", borderRadius: 8, fontSize: "0.78rem" }}
            >
              Create Study Group
            </button>
          </div>
        </div>
      )}

      {/* ==================== POST COMMENTS SLIDING BOTTOM SHEET ==================== */}
      {activeCommentPostId && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "flex-end", justifyContent: "center"
        }}>
          <div style={{
            background: "var(--bg-2)", borderTop: "1px solid var(--color-border)",
            borderTopLeftRadius: 16, borderTopRightRadius: 16,
            width: "100%", maxWidth: 420, padding: 16, maxHeight: "75vh", display: "flex", flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>Comments</span>
              <button onClick={() => setActiveCommentPostId(null)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              {commentsQuery.isLoading ? (
                <div style={{ textAlign: "center", color: "#555", padding: 20 }}>Loading comments...</div>
              ) : (commentsQuery.data ?? []).length === 0 ? (
                <div style={{ textAlign: "center", color: "#555", padding: 30, fontSize: "0.8rem" }}>
                  No comments yet. Write the first comment!
                </div>
              ) : (
                (commentsQuery.data ?? []).map((c: any) => (
                  <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: avatarGradient(c.authorId), display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 800, color: "#0c0c0c", fontSize: "0.75rem", flexShrink: 0
                    }}>
                      {c.author.avatar && !c.author.avatar.startsWith("http") ? c.author.avatar : c.author.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#fff" }}>{c.author.name}</span>
                        <span style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)" }}>{timeAgo(c.createdAt)}</span>
                      </div>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--color-foreground)", lineHeight: 1.4 }}>
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handlePostComment} style={{ display: "flex", gap: 8, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                style={{
                  flex: 1, background: "var(--bg-3)", border: "1px solid var(--color-border)",
                  borderRadius: 20, padding: "8px 14px", color: "#fff", fontSize: "0.8rem", outline: "none"
                }}
              />
              <button 
                type="submit" 
                disabled={addComment.isPending}
                style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
