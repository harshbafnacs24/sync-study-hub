import { api } from "../api-client";
import type { FeedComment, FeedPost } from "../types";

export const postsStore = {
  feed: () => api.getFeed().then((r) => r.posts ?? []),
  create: (content: string, media?: { mediaUrl: string; mediaType: "image" | "gif" }) =>
    api.createPost(content, media).then((r) => r.post),
  update: (id: string, content: string, media?: { mediaUrl: string | null; mediaType: "image" | "gif" | null }) =>
    api.updatePost(id, content, media).then((r) => r.post),
  remove: (id: string) => api.deletePost(id),
  toggleLike: (id: string) => api.toggleLike(id).then((r) => r.post),
  comments: (postId: string) => api.getComments(postId).then((r) => r.comments ?? []),
  addComment: (postId: string, content: string) => api.addComment(postId, content).then((r) => r.comment),
};

export type { FeedPost, FeedComment };
