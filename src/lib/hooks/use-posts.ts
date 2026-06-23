import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsStore } from "../store/posts";

export function useFeedPosts(page = 1, limit = 15) {
  return useQuery({
    queryKey: ["feed-posts", page, limit],
    queryFn: () => postsStore.feed(page, limit),
    staleTime: 0,
  });
}

export function useStories() {
  return useQuery({
    queryKey: ["stories"],
    queryFn: () => postsStore.stories(),
    staleTime: 0,
  });
}

export function useReels() {
  return useQuery({
    queryKey: ["reels"],
    queryFn: () => postsStore.reels(),
    staleTime: 0,
  });
}

export function useSavedPosts() {
  return useQuery({
    queryKey: ["saved-posts"],
    queryFn: () => postsStore.saved(),
    staleTime: 0,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: string | { content: string; mediaUrl?: string; mediaType?: "image" | "video" | "gif"; type?: "post" | "story" | "reel" }) => {
      if (typeof input === "string") return postsStore.create(input);
      const { content, mediaUrl, mediaType, type } = input;
      return postsStore.create(content, mediaUrl && mediaType ? { mediaUrl, mediaType } : undefined, type);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["reels"] });
    },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content, mediaUrl, mediaType }: { id: string; content: string; mediaUrl?: string | null; mediaType?: "image" | "video" | "gif" | null }) =>
      postsStore.update(id, content, mediaUrl !== undefined ? { mediaUrl, mediaType: mediaType ?? null } : undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => postsStore.toggleLike(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["reels"] });
    },
  });
}

export function useToggleSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => postsStore.toggleSave(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["saved-posts"] });
      qc.invalidateQueries({ queryKey: ["reels"] });
    },
  });
}

export function useToggleShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => postsStore.toggleShare(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["reels"] });
    },
  });
}

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ["post-comments", postId],
    queryFn: () => postsStore.comments(postId),
    enabled: !!postId,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      postsStore.addComment(postId, content),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["post-comments", vars.postId] });
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["reels"] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postsStore.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["reels"] });
    },
  });
}
