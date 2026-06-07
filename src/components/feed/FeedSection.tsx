import { useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { timeAgo } from "../messaging/Avatar";
import {
  useFeedPosts, useCreatePost, useToggleLike, useAddComment, usePostComments,
} from "../../lib/hooks/use-posts";
import type { FeedPost } from "../../lib/types";
import { toast } from "sonner";

function EmojiAvatar({ avatar, name, size = 34 }: { avatar?: string | null; name: string; size?: number }) {
  const isEmoji = avatar && !avatar.startsWith("http") && !avatar.startsWith("/") && !avatar.startsWith("data:");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", border: "1.5px solid var(--color-primary)",
      background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, lineHeight: 1,
    }}>
      {isEmoji ? avatar : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function CreatePostForm() {
  const { user } = useAuth();
  const create = useCreatePost();
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    create.mutate(content.trim(), {
      onSuccess: () => { setContent(""); setOpen(false); toast.success("Post shared!"); },
      onError: () => toast.error("Failed to create post"),
    });
  };

  const avatar = (user as any)?.avatar;

  if (!open) {
    return (
      <div className="ss-card" style={{ padding: 14, marginBottom: 16, background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setOpen(true)}>
          <EmojiAvatar avatar={avatar} name={user?.name ?? "Me"} size={36} />
          <div style={{ flex: 1, background: "var(--bg-3)", padding: "8px 14px", borderRadius: 20, color: "var(--color-muted-foreground)", fontSize: "0.78rem" }}>
            Share your study progress...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ss-card" style={{ padding: 14, marginBottom: 16, background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 16 }}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="ss-mono" style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--color-primary)" }}>NEW POST</span>
          <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", fontSize: "0.75rem" }}>Cancel</button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What are you studying today?"
          rows={3}
          required
          style={{
            width: "100%", background: "var(--bg-3)", border: "1px solid var(--color-border)",
            borderRadius: 12, padding: 10, color: "var(--color-foreground)", fontSize: "0.8rem", resize: "none", outline: "none",
          }}
        />
        <button type="submit" className="ss-btn ss-btn-primary" disabled={create.isPending} style={{ width: "100%", padding: "8px 0", borderRadius: 8, fontSize: "0.78rem" }}>
          Share to Feed
        </button>
      </form>
    </div>
  );
}

function ApiFeedPostCard({ post }: { post: FeedPost }) {
  const toggleLike = useToggleLike();
  const addComment = useAddComment();
  const { data: comments = [] } = usePostComments(post.id);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate({ postId: post.id, content: commentText.trim() }, {
      onSuccess: () => setCommentText(""),
    });
  };

  return (
    <div className="ss-card ss-card-anim" style={{ padding: 0, overflow: "hidden", background: "var(--bg-2)", border: "1px solid var(--color-border)", borderRadius: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
        <EmojiAvatar avatar={post.author.avatar} name={post.author.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-foreground)" }}>{post.author.name}</div>
          <div style={{ fontSize: "0.68rem", color: "var(--color-muted-foreground)" }}>
            {post.author.school} · {timeAgo(post.createdAt)}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 14px 12px", fontSize: "0.82rem", lineHeight: 1.55, color: "var(--color-foreground)" }}>
        {post.content}
        {post.editedAt && <span style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", marginLeft: 6 }}>(edited)</span>}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "6px 14px 10px", borderTop: "1px solid var(--color-border)" }}>
        <button
          onClick={() => toggleLike.mutate(post.id)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: post.liked ? "#ff4d6d" : "var(--color-muted-foreground)" }}
        >
          <span style={{ fontSize: "0.9rem" }}>{post.liked ? "❤️" : "🤍"}</span>
          <span className="ss-mono" style={{ fontSize: "0.75rem", fontWeight: 700 }}>{post.likeCount}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--color-muted-foreground)" }}
        >
          💬 <span className="ss-mono" style={{ fontSize: "0.75rem", fontWeight: 700 }}>{post.commentCount}</span>
        </button>
      </div>

      {showComments && (
        <div style={{ borderTop: "1px solid var(--color-border)", padding: 10, background: "rgba(255,255,255,0.01)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflowY: "auto", marginBottom: 10 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ fontSize: "0.75rem", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, marginRight: 5 }}>{c.author.name}</span>
                {c.content}
              </div>
            ))}
          </div>
          <form onSubmit={handleComment} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={{ flex: 1, background: "var(--bg-3)", border: "1px solid var(--color-border)", borderRadius: 20, padding: "5px 12px", color: "var(--color-foreground)", fontSize: "0.75rem", outline: "none" }}
            />
            <button type="submit" style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>Post</button>
          </form>
        </div>
      )}
    </div>
  );
}

export function FeedSection({ suggestedSlot }: { suggestedSlot?: React.ReactNode }) {
  const { data: posts = [], isLoading } = useFeedPosts();

  return (
    <div>
      <CreatePostForm />
      {suggestedSlot}
      {isLoading ? (
        <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Loading feed…</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", color: "#555", padding: 40, fontSize: "0.85rem" }}>
          No posts yet. Add friends and share your first study update!
        </div>
      ) : (
        posts.map((post) => <ApiFeedPostCard key={post.id} post={post} />)
      )}
    </div>
  );
}
