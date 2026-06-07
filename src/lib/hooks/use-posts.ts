import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsStore } from "../store/posts";

export function useFeedPosts() {
  return useQuery({ queryKey: ["feed-posts"], queryFn: () => postsStore.feed(), staleTime: 0 });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => postsStore.create(content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => postsStore.toggleLike(postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
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
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postsStore.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}
