import { useState, useEffect } from "react";
import { createFileRoute, Link } from '@tanstack/react-router'
import { Globe, UserPlus, Users, Search, CheckCircle, Clock, X, UserCheck, MessageSquare, Bell } from "lucide-react";
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
import { networkStore, type NetworkUser, type Connection } from "../../lib/store/network";
import { useAuth } from "../../lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Friends — Sync & Study" }] }),
  component: DiscoverPage,
});

type DiscoverTab = "feed" | "search" | "foryou" | "network";

/* ─── Profile Card ──────────────────────────────────────────────────────── */

function ProfileCard({ user }: { user: any }) {
  const connStatus = useConnectionStatus(user.id);
  const send = useSendConnectionRequest();
  const remove = useRemoveConnection();
  const connections = useConnections();

  const handleConnect = () => {
    if (connStatus.status === "none") {
      send.mutate(user.id, {
        onSuccess: () => toast.success(`Connection request sent to ${user.name}`),
        onError: () => toast.error("Failed to send request"),
      });
    } else if (connStatus.status === "connected" && connStatus.connectionId) {
      remove.mutate(connStatus.connectionId, { onSuccess: () => toast.success("Connection removed") });
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
      {/* Header row */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Avatar */}
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
        {/* Info */}
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
        {/* Online dot */}
        {user.online && (
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#3ddc84", flexShrink: 0, marginTop: 4,
          }} />
        )}
      </div>

      {/* Bio */}
      <p style={{ fontSize: "0.78rem", color: "#999", margin: 0, lineHeight: 1.5 }}>
        {user.bio}
      </p>

      {/* Interest chips */}
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

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>{user.studyStreak ?? 0}d</div>
          <div style={{ fontSize: "0.6rem", color: "#555", fontFamily: "var(--font-mono)" }}>STREAK</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>{user.totalHours ?? 0}h</div>
          <div style={{ fontSize: "0.6rem", color: "#555", fontFamily: "var(--font-mono)" }}>TOTAL</div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Actions */}
        <div style={{ display: "flex", gap: 6 }}>
          <Link
            to="/network/$userId"
            params={{ userId: user.id }}
            className="ss-btn ss-btn-outline"
            style={{ padding: "6px 10px", fontSize: "0.72rem", borderRadius: 8 }}
          >
            View
          </Link>
          <button
            onClick={handleConnect}
            disabled={send.isPending || remove.isPending || connStatus.status === "outgoing_pending" || connStatus.status === "blocked"}
            className={connStatus.status === "connected" ? "ss-btn ss-btn-outline" : "ss-btn ss-btn-primary"}
            style={{ padding: "6px 10px", fontSize: "0.72rem", borderRadius: 8 }}
          >
            {connStatus.status === "connected" ? <><UserCheck size={12} /> Connected</> :
             connStatus.status === "outgoing_pending" ? <><Clock size={12} /> Sent</> :
             connStatus.status === "incoming_pending" ? <><CheckCircle size={12} /> Accept</> :
             <><UserPlus size={12} /> Connect</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Resolved Network User Card ─────────────────────────────────────────── */

function ResolvedNetworkUserCard({ userId }: { userId: string }) {
  const { data: user, isLoading } = useNetworkUser(userId);
  if (isLoading || !user) return null;
  return <ProfileCard user={user} />;
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

/* ─── Instagram-Style Stories Overlay Modal ──────────────────────────────── */

interface Story {
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  caption: string;
  viewed: boolean;
}

function StoryModal({ stories, initialIndex, onClose }: { stories: Story[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
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
        return p + 2.5; // Fills in 4 seconds (40 steps of 2.5% every 100ms)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [index, stories.length, onClose]);

  if (!story) return null;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.97)", display: "flex", flexDirection: "column",
      justifyContent: "space-between", padding: 16
    }}>
      {/* Top Bar with progress indicators */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {stories.map((_, i) => {
            let widthPercent = 0;
            if (i < index) widthPercent = 100;
            else if (i === index) widthPercent = progress;
            return (
              <div key={i} style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${widthPercent}%`, height: "100%", background: "#fff", transition: i === index ? "width 0.1s linear" : "none" }} />
              </div>
            );
          })}
        </div>
        {/* User Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {story.userAvatar && (story.userAvatar.startsWith("http") || story.userAvatar.startsWith("/") || story.userAvatar.startsWith("data:")) ? (
            <img src={story.userAvatar} alt="" style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #fff", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #fff",
              background: "rgba(255, 255, 255, 0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem", lineHeight: 1, userSelect: "none"
            }}>
              {story.userAvatar}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>{story.userName}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.68rem" }}>Active Study Story</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", fontWeight: 300, cursor: "pointer", padding: "0 8px" }}>×</button>
        </div>
      </div>

      {/* Media Image/GIF */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", margin: "10px 0", overflow: "hidden", position: "relative" }}>
        <img src={story.mediaUrl} alt="" style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }} />
      </div>

      {/* Caption card */}
      <div style={{
        background: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)",
        borderRadius: 14, padding: "12px 18px", marginBottom: 10,
        border: "1px solid rgba(255,255,255,0.1)", zIndex: 10
      }}>
        <p style={{ color: "#fff", fontSize: "0.82rem", margin: 0, lineHeight: 1.5, textAlign: "center" }}>
          {story.caption}
        </p>
      </div>
    </div>
  );
}

/* ─── Instagram-Style Feed Post Card ─────────────────────────────────────── */

interface FeedPost {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatar: string;
  mediaUrl: string;
  caption: string;
  likes: number;
  hasLiked: boolean;
  comments: { userName: string; text: string }[];
  createdAt: string;
}

function FeedPostCard({ post, onLike, onAddComment }: { post: FeedPost; onLike: () => void; onAddComment: (text: string) => void }) {
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(commentText);
    setCommentText("");
  };

  return (
    <div className="ss-card ss-card-anim" style={{ padding: 0, overflow: "hidden", background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 16, marginBottom: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
        {post.userAvatar && (post.userAvatar.startsWith("http") || post.userAvatar.startsWith("/") || post.userAvatar.startsWith("data:")) ? (
          <img src={post.userAvatar} alt="" style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid var(--color-primary)", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: 34, height: 34, borderRadius: "50%", border: "1.5px solid var(--color-primary)",
            background: "var(--bg-3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem", lineHeight: 1, userSelect: "none"
          }}>
            {post.userAvatar}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.userName}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>@{post.userHandle}</div>
        </div>
        <span className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)" }}>{post.createdAt}</span>
      </div>

      {/* Media Content */}
      <div style={{ width: "100%", background: "#060606", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
        <img src={post.mediaUrl} alt="Post content" style={{ width: "100%", height: "auto", display: "block", maxHeight: 300, objectFit: "cover" }} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "10px 14px 6px" }}>
        <button onClick={onLike} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, color: post.hasLiked ? "#ff4d6d" : "var(--color-muted-foreground)" }}>
          {post.hasLiked ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          )}
          <span className="ss-mono" style={{ fontSize: "0.75rem", color: post.hasLiked ? "#ff4d6d" : "var(--color-muted-foreground)", fontWeight: 700 }}>{post.likes}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, color: "var(--color-muted-foreground)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="ss-mono" style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", fontWeight: 700 }}>{post.comments.length}</span>
        </button>
      </div>

      {/* Caption */}
      <div style={{ padding: "0 14px 10px", fontSize: "0.8rem", lineHeight: 1.5, color: "var(--color-foreground)" }}>
        <span style={{ fontWeight: 800, color: "var(--color-foreground)", marginRight: 6 }}>@{post.userHandle}</span>
        {post.caption}
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ borderTop: "1px solid var(--color-border)", background: "rgba(255,255,255,0.01)", padding: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflowY: "auto", marginBottom: 10 }}>
            {post.comments.map((c, idx) => (
              <div key={idx} style={{ fontSize: "0.75rem", lineHeight: 1.4, color: "var(--color-muted-foreground)" }}>
                <span style={{ fontWeight: 700, color: "var(--color-foreground)", marginRight: 5 }}>@{c.userName}</span>
                {c.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmitComment} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={{
                flex: 1, background: "var(--bg-3)", border: "1px solid var(--color-border)",
                borderRadius: 20, padding: "5px 12px", color: "var(--color-foreground)", fontSize: "0.75rem", outline: "none"
              }}
            />
            <button type="submit" style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>Post</button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ─── Suggested Friend Card (similar interests or characteristics) ────────── */

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
      width: 140,
      flexShrink: 0,
      background: "var(--bg-2)",
      border: "1px solid var(--color-border)",
      borderRadius: 12,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 8,
      position: "relative"
    }}>
      {/* Avatar */}
      <div style={{
        width: 50, height: 50, borderRadius: "50%",
        background: user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? "var(--bg-3)" : avatarGradient(user.id),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: user.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:")) ? "1.6rem" : "1.1rem",
        border: "2px solid var(--color-border)",
        overflow: "hidden"
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

      {/* Info */}
      <div style={{ minWidth: 0, width: "100%" }}>
        <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--color-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.name}
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--color-primary)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          @{user.handle}
        </div>
        <div style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", marginTop: 4, height: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {matchText}
        </div>
      </div>

      {/* Connect Button */}
      <button
        onClick={handleConnect}
        disabled={send.isPending || connStatus.status === "outgoing_pending"}
        className="ss-btn ss-btn-primary"
        style={{
          width: "100%",
          padding: "5px 0",
          fontSize: "0.68rem",
          borderRadius: 6,
          marginTop: 2
        }}
      >
        {connStatus.status === "outgoing_pending" ? "Sent" : "Connect"}
      </button>
    </div>
  );
}

/* ─── Create Post Card ────────────────────────────────────────────────────── */

interface CreatePostCardProps {
  onAddPost: (caption: string, mediaUrl: string) => void;
  user: any;
}

function CreatePostCard({ onAddPost, user }: CreatePostCardProps) {
  const [caption, setCaption] = useState("");
  const [selectedMedia, setSelectedMedia] = useState("https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=600&q=80");
  const [showForm, setShowForm] = useState(false);

  const presets = [
    { url: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=600&q=80", label: "💻 Code" },
    { url: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80", label: "☕ Cozy Desk" },
    { url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80", label: "📚 Library" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3BndmdmM283OHZpdHhvbTh0cnNscjR2OHU3bzY2dnN6aWRnbWNnayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/33OrjzUFwkwEg/giphy.gif", label: "🐱 Lofi Cat" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmtlbjNuZnoxOHl6aThnZTR3cnR5bGVsbGlqZWV4ZXplMW13bzdhOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13HgwGsXF0aiGY/giphy.gif", label: "⚡ Matrix" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVtcXZjNm04ejRxamRjcmtyaTBpcnM5YnhoYzAwMjdvdzM5eXphOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/V4aB3p69rlY9q/giphy.gif", label: "🌌 Chill GVL" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;
    onAddPost(caption, selectedMedia);
    setCaption("");
    setShowForm(false);
  };

  const isUserEmoji = user?.avatar && !(user.avatar.startsWith("http") || user.avatar.startsWith("/") || user.avatar.startsWith("data:"));

  return (
    <div className="ss-card" style={{ padding: 14, marginBottom: 16, background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 16 }}>
      {!showForm ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setShowForm(true)}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: isUserEmoji ? "var(--bg-3)" : "var(--color-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: isUserEmoji ? "1.25rem" : "0.85rem", fontWeight: "bold"
          }}>
            {isUserEmoji ? user.avatar : user?.name?.slice(0, 2).toUpperCase() || "ME"}
          </div>
          <div style={{ flex: 1, background: "var(--bg-3)", padding: "8px 14px", borderRadius: 20, color: "var(--color-muted-foreground)", fontSize: "0.78rem" }}>
            Share your study progress or upload a feed post...
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="ss-mono" style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--color-primary)" }}>NEW STUDY POST</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", fontSize: "0.75rem" }}>Cancel</button>
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What are you studying or coding right now?"
            rows={3}
            required
            style={{
              width: "100%", background: "var(--bg-3)", border: "1px solid var(--color-border)",
              borderRadius: 12, padding: 10, color: "var(--color-foreground)", fontSize: "0.8rem",
              fontFamily: "var(--font-body)", resize: "none", outline: "none"
            }}
          />

          <div>
            <span className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", display: "block", marginBottom: 6 }}>SELECT POST MEDIA</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {presets.map((p) => (
                <button
                  type="button"
                  key={p.url}
                  onClick={() => setSelectedMedia(p.url)}
                  style={{
                    padding: "6px 2px",
                    background: selectedMedia === p.url ? "rgba(232, 255, 71, 0.08)" : "var(--bg-3)",
                    border: selectedMedia === p.url ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: "0.68rem",
                    fontWeight: selectedMedia === p.url ? "bold" : "normal",
                    color: selectedMedia === p.url ? "var(--color-primary)" : "var(--color-muted-foreground)",
                    transition: "all 0.15s ease"
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="ss-btn ss-btn-primary" style={{ width: "100%", padding: "8px 0", borderRadius: 8, fontSize: "0.78rem" }}>
            Share to Feed
          </button>
        </form>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

function DiscoverPage() {
  const [tab, setTab] = useState<DiscoverTab>("feed"); // Feed is now the default tab
  const [query, setQuery] = useState("");
  const { user: currentUser } = useAuth();
  const connections = useConnections();

  const search = useSearchUsers(query);
  const forYou = useForYouUsers();

  const suggestedUsers = (forYou.data ?? []).filter((u: any) => {
    if (u.id === currentUser?.id) return false;
    const isConn = (connections.data ?? []).some((c: any) =>
      (c.fromUserId === currentUser?.id && c.toUserId === u.id) ||
      (c.fromUserId === u.id && c.toUserId === currentUser?.id)
    );
    return !isConn;
  });

  const accepted = (connections.data ?? []).filter((c: any) => c.status === "accepted");
  const pending  = (connections.data ?? []).filter((c: any) => c.status === "pending");

  // Since we resolve user objects dynamically, we map through accepted connections
  // and render a sub-component that fetches the specific user details
  const connectedIds = accepted.map((c: any) =>
    c.fromUserId === currentUser?.id ? c.toUserId : c.fromUserId
  );

  // --- Instagram Stories State ---
  const [stories, setStories] = useState<Story[]>([
    {
      userId: "kabir_id",
      userName: "Kabir Singh",
      userAvatar: "👨‍🎓",
      mediaUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=600&q=80",
      caption: "Setting up the new IDE theme. Custom keyboard is feeling crisp! ⌨️💻",
      viewed: false
    },
    {
      userId: "aanya_id",
      userName: "Aanya Mehta",
      userAvatar: "👩‍🎓",
      mediaUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80",
      caption: "Cracking binary tree traversals before coffee gets cold. ☕🌳",
      viewed: false
    },
    {
      userId: "riya_id",
      userName: "Riya Sharma",
      userAvatar: "👩‍🏫",
      mediaUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmtlbjNuZnoxOHl6aThnZTR3cnR5bGVsbGlqZWV4ZXplMW13bzdhOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13HgwGsXF0aiGY/giphy.gif",
      caption: "Sage AI has some suggestions. Study grind on AI models! 🤖✨",
      viewed: false
    },
    {
      userId: "arjun_id",
      userName: "Arjun Verma",
      userAvatar: "👨‍💻",
      mediaUrl: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=600&q=80",
      caption: "SQL query optimization is an art form. DB is running 10x faster now! 💾📊",
      viewed: false
    },
    {
      userId: "meera_id",
      userName: "Meera Iyer",
      userAvatar: "👩‍💻",
      mediaUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVtcXZjNm04ejRxamRjcmtyaTBpcnM5YnhoYzAwMjdvdzM5eXphOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/V4aB3p69rlY9q/giphy.gif",
      caption: "Focusing on operating system threads. Keep grinding! ☕⚙️",
      viewed: false
    }
  ]);

  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null);

  const handleOpenStory = (index: number) => {
    setActiveStoryIdx(index);
    setStories((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, viewed: true } : s))
    );
  };

  // --- Instagram Feed State (User-Generated with LocalStorage Persistence) ---
  const [posts, setPosts] = useState<FeedPost[]>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("sas.feed_posts");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse feed posts", e);
        }
      }
    }
    return [
      {
        id: "post-1",
        userId: "aanya_id",
        userName: "Aanya Mehta",
        userHandle: "aanya_mehta",
        userAvatar: "👩‍🎓",
        mediaUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80",
        caption: "Midterm prep has officially begun. Sliding window problems are starting to click! Who's up for a focus room session tonight? 📚🚀",
        likes: 12,
        hasLiked: false,
        comments: [
          { userName: "kabir_singh", text: "I'm down for a study room at 8 PM!" },
          { userName: "arjun_verma", text: "Need help with sliding window. Count me in!" }
        ],
        createdAt: "2h ago"
      },
      {
        id: "post-2",
        userId: "kabir_id",
        userName: "Kabir Singh",
        userHandle: "kabir_singh",
        userAvatar: "👨‍🎓",
        mediaUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3BndmdmM283OHZpdHhvbTh0cnNscjR2OHU3bzY2dnN6aWRnbWNnayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/33OrjzUFwkwEg/giphy.gif",
        caption: "Me writing React form hooks at 2 AM. Hydrated and locked in! 🐱💻☕",
        likes: 28,
        hasLiked: false,
        comments: [
          { userName: "aanya_mehta", text: "Accurate! Go sleep Kabir 😂" },
          { userName: "meera_iyer", text: "React 19 forms are super clean though!" }
        ],
        createdAt: "4h ago"
      },
      {
        id: "post-3",
        userId: "riya_id",
        userName: "Riya Sharma",
        userHandle: "riya_sharma",
        userAvatar: "👩‍🏫",
        mediaUrl: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80",
        caption: "Cozy vibes only for tonight's machine learning model training. Sage AI is helping debug my loss function. 💡🤖🌌",
        likes: 19,
        hasLiked: false,
        comments: [
          { userName: "kabir_singh", text: "That workspace setup looks incredible." }
        ],
        createdAt: "1d ago"
      }
    ];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sas.feed_posts", JSON.stringify(posts));
    }
  }, [posts]);

  const handleLikePost = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const nextLiked = !p.hasLiked;
          return {
            ...p,
            hasLiked: nextLiked,
            likes: p.likes + (nextLiked ? 1 : -1)
          };
        }
        return p;
      })
    );
  };

  const handleAddComment = (postId: string, commentText: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...p.comments, { userName: (currentUser as any)?.handle || currentUser?.name?.toLowerCase().replace(/\s+/g, "_") || "me", text: commentText }]
          };
        }
        return p;
      })
    );
  };

  const handleAddPost = (caption: string, mediaUrl: string) => {
    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      userId: currentUser?.id || "me",
      userName: currentUser?.name || "Dev User",
      userHandle: (currentUser as any)?.handle || currentUser?.name?.toLowerCase().replace(/\s+/g, "_") || "dev_user",
      userAvatar: currentUser?.avatar || "🧑‍🎓",
      mediaUrl,
      caption,
      likes: 0,
      hasLiked: false,
      comments: [],
      createdAt: "Just now"
    };
    setPosts((prev) => [newPost, ...prev]);
    toast.success("Post shared to feed!");
  };

  return (
    <PageTransition>
      {/* Stories Overlay */}
      {activeStoryIdx !== null && (
        <StoryModal
          stories={stories}
          initialIndex={activeStoryIdx}
          onClose={() => setActiveStoryIdx(null)}
        />
      )}

      {/* Header */}
      <div className="ss-ph" style={{ paddingBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <UserCheck size={18} style={{ color: "var(--color-primary)" }} />
            <div>
              <div className="ss-ph-label">PRODUCTIVITY FEED</div>
              <h1 className="ss-ph-title" style={{ fontSize: "1.3rem" }}>Friends &amp; Circles</h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to="/notifications"
              className="ss-btn ss-btn-outline"
              style={{ width: 38, height: 38, padding: 0, borderRadius: 999 }}
              aria-label="Notifications"
            >
              <Bell size={16} />
            </Link>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "#666", pointerEvents: "none",
          }} />
          <input
            className="ss-input"
            placeholder="Search friends by name, @handle, or interest..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setTab("search"); }}
            style={{ paddingLeft: 36, width: "100%" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 14, background: "rgba(255,255,255,0.03)", padding: 3, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
          {([
            { key: "feed", label: "Feed" },
            { key: "search", label: "Discover" },
            { key: "foryou", label: "For You" },
            { key: "network", label: `Network ${accepted.length > 0 ? `(${accepted.length})` : ""}` },
          ] as { key: DiscoverTab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="ss-mono"
              style={{
                flex: 1, padding: "8px 4px", fontSize: "0.62rem",
                textTransform: "uppercase", letterSpacing: "0.05em",
                borderRadius: 6, border: "none", cursor: "pointer",
                background: tab === key ? "rgba(232,255,71,0.08)" : "transparent",
                color: tab === key ? "var(--color-primary)" : "#666",
                fontWeight: tab === key ? "bold" : "normal",
                transition: "all 0.15s ease",
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="ss-body" style={{ paddingBottom: 80, paddingTop: 10 }}>

        {/* ─── Stories Bar ─── */}
        <div style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          padding: "4px 4px 12px 4px",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: 16,
          scrollbarWidth: "none"
        }} className="hide-scrollbar">
          <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {stories.map((story, i) => (
            <div 
              key={i} 
              onClick={() => handleOpenStory(i)}
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                cursor: "pointer", 
                flexShrink: 0 
              }}
            >
              {/* Outer ring border representing active/viewed story */}
              <div style={{
                width: 54, height: 54, borderRadius: "50%",
                background: story.viewed 
                  ? "var(--color-border)" 
                  : "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: story.viewed ? 1.5 : 2,
                boxShadow: story.viewed ? "none" : "0 0 6px rgba(220,39,67,0.3)"
              }}>
                <div style={{
                  width: "100%", height: "100%", borderRadius: "50%",
                  background: "var(--color-background)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 2
                }}>
                  {story.userAvatar && !(story.userAvatar.startsWith("http") || story.userAvatar.startsWith("/") || story.userAvatar.startsWith("data:")) ? (
                    <span style={{ fontSize: "1.5rem", userSelect: "none" }}>{story.userAvatar}</span>
                  ) : (
                    <img 
                      src={story.userAvatar} 
                      alt="" 
                      style={{ 
                        width: "100%", height: "100%", borderRadius: "50%", 
                        objectFit: "cover" 
                      }} 
                    />
                  )}
                </div>
              </div>
              <span className="ss-mono" style={{ 
                fontSize: "0.6rem", 
                color: story.viewed ? "var(--color-muted-foreground)" : "var(--color-foreground)", 
                marginTop: 6,
                fontWeight: story.viewed ? 500 : 700,
                maxWidth: 60,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                {story.userName.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>

        {/* ─── FEED TAB ─── */}
        {tab === "feed" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <CreatePostCard user={currentUser} onAddPost={handleAddPost} />

            {/* Suggested Friends Carousel (similar interests or characteristics) */}
            {suggestedUsers.length > 0 && (
              <div style={{
                marginBottom: 20,
                borderBottom: "1px solid var(--color-border)",
                paddingBottom: 16
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0 4px 10px 4px",
                }}>
                  <span className="ss-mono" style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--color-primary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Suggested for You
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)" }}>
                    Based on similar interests
                  </span>
                </div>
                <div style={{
                  display: "flex",
                  gap: 12,
                  overflowX: "auto",
                  padding: "4px 2px",
                  scrollbarWidth: "none",
                }} className="hide-scrollbar">
                  {suggestedUsers.map((su: any) => {
                    const currentUserProfile = currentUser as any;
                    const common = su.interests?.filter((i: string) => currentUserProfile?.interests?.includes(i)) || [];
                    const matchText = common.length > 0
                      ? `Similar interest: ${common[0]}`
                      : su.school === currentUserProfile?.school
                        ? `Same School: ${su.school}`
                        : `${su.year} · ${su.school}`;

                    return (
                      <SuggestedFriendCard
                        key={su.id}
                        user={su}
                        matchText={matchText}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {posts.map((post) => (
              <FeedPostCard 
                key={post.id} 
                post={post} 
                onLike={() => handleLikePost(post.id)}
                onAddComment={(text) => handleAddComment(post.id, text)}
              />
            ))}
          </div>
        )}

        {/* ─── SEARCH / DISCOVER TAB ─── */}
        {tab === "search" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {search.isLoading ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Searching…</div>
            ) : (search.data ?? []).length === 0 ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40, fontSize: "0.85rem" }}>
                {query ? `No results for "${query}"` : "Start typing to search for students"}
              </div>
            ) : (
              (search.data ?? []).map((u) => <ProfileCard key={u.id} user={u} />)
            )}
          </div>
        )}

        {/* ─── FOR YOU TAB ─── */}
        {tab === "foryou" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              padding: "10px 14px",
              background: "rgba(232,255,71,0.04)",
              border: "1px solid rgba(232,255,71,0.08)",
              borderRadius: 10,
              fontSize: "0.75rem",
              color: "#888",
              lineHeight: 1.5,
            }}>
              ✦ Recommendations based on your <span style={{ color: "var(--color-primary)" }}>study interests</span> and <span style={{ color: "var(--color-primary)" }}>school</span>.
            </div>
            {forYou.isLoading ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Loading…</div>
            ) : (forYou.data ?? []).length === 0 ? (
              <div style={{ textAlign: "center", color: "#555", padding: 40, fontSize: "0.85rem" }}>
                Add subjects to your profile to get personalized recommendations.
              </div>
            ) : (
              (forYou.data ?? []).map((u) => <ProfileCard key={u.id} user={u} />)
            )}
          </div>
        )}

        {/* ─── MY NETWORK TAB ─── */}
        {tab === "network" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Pending requests */}
            {pending.length > 0 && (
              <div>
                <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase", marginBottom: 10 }}>
                  Pending ({pending.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pending.map((c) => (
                    <PendingRequestCard 
                      key={c.id} 
                      conn={c} 
                      onAcceptSuccess={() => connections.refetch()} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Connected */}
            <div>
              <div className="ss-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "#666", textTransform: "uppercase", marginBottom: 10 }}>
                Connections ({accepted.length})
              </div>
              {connectedIds.length === 0 ? (
                <div style={{
                  padding: 32, textAlign: "center", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 12
                }}>
                  <Users size={28} style={{ color: "#333", marginBottom: 10 }} />
                  <div style={{ fontSize: "0.85rem", color: "#555" }}>No connections yet</div>
                  <div style={{ fontSize: "0.75rem", color: "#444", marginTop: 4 }}>
                    Go to Discover or For You to connect with students.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {connectedIds.map((uid) => <ResolvedNetworkUserCard key={uid} userId={uid} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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
export { DiscoverPage };
