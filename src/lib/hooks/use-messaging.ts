import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesStore } from "../store/messages";
import { communitiesStore } from "../store/communities";
import { notificationsStore } from "../store/notifications";

/* ---------- DMs ---------- */

export function useConversations() {
  return useQuery({ queryKey: ["conversations"], queryFn: async () => messagesStore.conversations(), staleTime: 0 });
}
export function useConversation(id: string) {
  return useQuery({ queryKey: ["conversation", id], queryFn: async () => messagesStore.conversation(id) ?? null });
}
export function useDMs(conversationId: string) {
  return useQuery({
    queryKey: ["dms", conversationId],
    queryFn: async () => messagesStore.messages(conversationId),
    staleTime: 0,
  });
}
export function useSendDM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) =>
      messagesStore.send(conversationId, text),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["dms", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => messagesStore.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => messagesStore.togglePin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

/* ---------- Communities ---------- */

export function useCommunities() {
  return useQuery({ queryKey: ["communities"], queryFn: async () => communitiesStore.list(), staleTime: 0 });
}
export function useCommunity(id: string) {
  return useQuery({ queryKey: ["community", id], queryFn: async () => communitiesStore.get(id) ?? null });
}
export function useChannels(communityId: string) {
  return useQuery({
    queryKey: ["channels", communityId],
    queryFn: async () => communitiesStore.channels(communityId),
    staleTime: 0,
  });
}
export function useChannelMessages(channelId: string | undefined) {
  return useQuery({
    queryKey: ["channel-messages", channelId],
    queryFn: async () => (channelId ? communitiesStore.channelMessages(channelId) : []),
    enabled: !!channelId,
    staleTime: 0,
  });
}
export function usePostChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, text }: { channelId: string; text: string }) =>
      communitiesStore.postChannel(channelId, text),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["channel-messages", vars.channelId] }),
  });
}
export function useToggleJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => communitiesStore.toggleJoin(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communities"] });
      qc.invalidateQueries({ queryKey: ["community"] });
    },
  });
}
export function useCreateCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description: string; category: string; tags: string[] }) =>
      communitiesStore.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communities"] }),
  });
}

/* ---------- Notifications ---------- */

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: async () => notificationsStore.list(), staleTime: 0 });
}
export function useUnreadNotifications() {
  return useQuery({ queryKey: ["notifications", "unread"], queryFn: async () => notificationsStore.unreadCount(), staleTime: 5_000 });
}
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => notificationsStore.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
