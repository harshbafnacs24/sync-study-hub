import { api } from "../api-client";
import type { FeedComment, FeedPost } from "../types";

export const postsStore = {
  feed: (page = 1, limit = 15) => api.getFeed(page, limit).then((r) => r.posts ?? []),
  get: (id: string) => api.getPost(id).then((r) => r.post),
  stories: () => api.getStories().then((r) => r.stories ?? []),
  saved: () => api.getSavedPosts().then((r) => r.posts ?? []),
  create: (content: string, media?: { mediaUrl: string; mediaType: "image" | "video" | "gif" }, type?: "post" | "story") =>
    api.createPost(content, media, type).then((r) => r.post),
  update: (id: string, content: string, media?: { mediaUrl: string | null; mediaType: "image" | "video" | "gif" | null }) =>
    api.updatePost(id, content, media).then((r) => r.post),
  remove: (id: string) => api.deletePost(id),
  toggleLike: (id: string) => api.toggleLike(id).then((r) => r.post),
  toggleSave: (id: string) => api.toggleSave(id).then((r) => r.post),
  toggleShare: (id: string) => api.toggleShare(id).then((r) => r.post),
  comments: (postId: string) => api.getComments(postId).then((r) => r.comments ?? []),
  addComment: (postId: string, content: string) => api.addComment(postId, content).then((r) => r.comment),
};

export type { FeedPost, FeedComment };
