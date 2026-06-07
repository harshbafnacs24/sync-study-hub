import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import type { TechFeedItem } from "../types";

export function useTechFeed(type?: string, category?: string) {
  return useQuery({
    queryKey: ["tech-feed", type, category],
    queryFn: () => api.getTechFeed(type, category).then((r) => r.items),
    staleTime: 60_000,
  });
}

export function useTechBookmarks() {
  return useQuery({
    queryKey: ["tech-feed", "bookmarks"],
    queryFn: () => api.getTechBookmarks().then((r) => r.items),
  });
}

export function useToggleTechLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleTechLike(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tech-feed"] }),
  });
}

export function useToggleTechBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleTechBookmark(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tech-feed"] });
      qc.invalidateQueries({ queryKey: ["tech-feed", "bookmarks"] });
    },
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => api.getPlatformStats().then((r) => r.stats),
    staleTime: 120_000,
  });
}

export function useTrending() {
  return useQuery({
    queryKey: ["platform-trending"],
    queryFn: () => api.getTrending(),
    staleTime: 120_000,
  });
}

export type { TechFeedItem };
