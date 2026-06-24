import { useRef, useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { timeAgo } from "../messaging/Avatar";
import {
  useFeedPosts, useCreatePost, useToggleLike, useAddComment, usePostComments,
  useDeletePost, useUpdatePost,
} from "../../lib/hooks/use-posts";
import { api, BACKEND_URL } from "../../lib/api-client";
import type { FeedPost } from "../../lib/types";
import { toast } from "sonner";

const GIF_PRESETS = [
  { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3BndmdmM283OHZpdHhvbTh0cnNscjR2OHU3bzY2dnN6aWRnbWNnayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/33OrjzUFwkwEg/giphy.gif", label: "🐱 Lofi" },
  { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmtlbjNuZnoxOHl6aThnZTR3cnR5bGVsbGlqZWV4ZXplMW13bzdhOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13HgwGsXF0aiGY/giphy.gif", label: "⚡ Matrix" },
  { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVtcXZjNm04ejRxamRjcmtyaTBpcnM5YnhoYzAwMjdvdzM5eXphOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/V4aB3p69rlY9q/giphy.gif", label: "🌌 Chill" },
];

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
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "gif" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { file: uploaded } = await api.uploadPostMedia(file);
      setMediaUrl(`${BACKEND_URL}${uploaded.url}`);
      setMediaType(uploaded.mediaType);
      toast.success("Image attached");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    create.mutate(
      mediaUrl && mediaType
        ? { content: content.trim(), mediaUrl, mediaType }
        : content.trim(),
      {
        onSuccess: () => {
          setContent("");
          setMediaUrl(null);
          setMediaType(null);
          setOpen(false);
          toast.success("Post shared!");
        },
        onError: () => toast.error("Failed to create post"),
      },
    );
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
          <button type="button" onClick={() => { setOpen(false); setMediaUrl(null); setMediaType(null); }} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", fontSize: "0.75rem" }}>Cancel</button>
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
        {mediaUrl && (
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border)" }}>
            <img src={mediaUrl} alt="Post media" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
            <button type="button" onClick={() => { setMediaUrl(null); setMediaType(null); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer" }}>Remove</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <input ref={fileRef} type="file" accept="image/*,.gif" style={{ display: "none" }} onChange={handleFile} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="ss-btn ss-btn-outline" style={{ padding: "6px 10px", fontSize: "0.72rem" }}>
            {uploading ? "Uploading…" : "📷 Image"}
          </button>
          {GIF_PRESETS.map((g) => (
            <button
              key={g.url}
              type="button"
              onClick={() => { setMediaUrl(g.url); setMediaType("gif"); }}
              className="ss-btn ss-btn-outline"
              style={{ padding: "6px 8px", fontSize: "0.68rem", borderColor: mediaUrl === g.url ? "var(--color-primary)" : undefined }}
            >
              {g.label}
            </button>
          ))}
        </div>
        <button type="submit" className="ss-btn ss-btn-primary" disabled={create.isPending || uploading} style={{ width: "100%", padding: "8px 0", borderRadius: 8, fontSize: "0.78rem" }}>
          Share to Feed
        </button>
      </form>
    </div>
  );
}

function ApiFeedPostCard({ post }: { post: FeedPost }) {
  const { user } = useAuth();
  const toggleLike = useToggleLike();
  const addComment = useAddComment();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const { data: comments = [] } = usePostComments(post.id);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const isOwner = user?.id === post.authorId;

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate({ postId: post.id, content: commentText.trim() }, {
      onSuccess: () => setCommentText(""),
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    updatePost.mutate({ id: post.id, content: editContent.trim() }, {
      onSuccess: () => { setEditing(false); toast.success("Post updated"); },
      onError: () => toast.error("Failed to update post"),
    });
  };

  const mediaSrc = post.mediaUrl?.startsWith("http") ? post.mediaUrl : post.mediaUrl ? `${BACKEND_URL}${post.mediaUrl}` : null;

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
        {isOwner && !editing && (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", fontSize: "0.7rem" }}>Edit</button>
            <button
              onClick={() => deletePost.mutate(post.id, { onSuccess: () => toast.success("Post deleted") })}
              style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: "0.7rem" }}
            >Delete</button>
          </div>
        )}
      </div>

      {mediaSrc && (
        <div style={{ width: "100%", background: "#060606", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
          <img src={mediaSrc} alt="Post media" style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }} />
        </div>
      )}

      {editing ? (
        <form onSubmit={handleEdit} style={{ padding: "0 14px 12px" }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            style={{ width: "100%", background: "var(--bg-3)", border: "1px solid var(--color-border)", borderRadius: 8, padding: 8, color: "var(--color-foreground)", fontSize: "0.8rem", resize: "none" }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button type="submit" className="ss-btn ss-btn-primary" style={{ padding: "4px 10px", fontSize: "0.72rem" }}>Save</button>
            <button type="button" onClick={() => { setEditing(false); setEditContent(post.content); }} className="ss-btn ss-btn-outline" style={{ padding: "4px 10px", fontSize: "0.72rem" }}>Cancel</button>
          </div>
        </form>
      ) : (
        <div style={{ padding: "0 14px 12px", fontSize: "0.82rem", lineHeight: 1.55, color: "var(--color-foreground)" }}>
          {post.content}
          {post.editedAt && <span style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", marginLeft: 6 }}>(edited)</span>}
        </div>
      )}

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
