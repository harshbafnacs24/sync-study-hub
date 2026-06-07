import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesStore } from "../store/messages";
import { communitiesStore } from "../store/communities";
import { notificationsStore } from "../store/notifications";
import { socketBus, SocketEvents } from "../socket";

/* ---------- Live subscriptions (cross-tab via BroadcastChannel) ---------- */

export function useLiveInbox() {
  const qc = useQueryClient();
  useEffect(() => {
    const offMsg = socketBus.on(SocketEvents.MessageNew, () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    });
    const offConv = socketBus.on(SocketEvents.ConversationUpdated, () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    });
    return () => { offMsg(); offConv(); };
  }, [qc]);
}

export function useLiveDM(conversationId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const off = socketBus.on(SocketEvents.MessageNew, (p: { conversationId: string }) => {
      if (p?.conversationId === conversationId) {
        qc.invalidateQueries({ queryKey: ["dms", conversationId] });
      }
    });
    return off;
  }, [qc, conversationId]);
}

export function useLiveChannel(channelId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!channelId) return;
    const off = socketBus.on(SocketEvents.ChannelMessage, (p: { channelId: string }) => {
      if (p?.channelId === channelId) {
        qc.invalidateQueries({ queryKey: ["channel-messages", channelId] });
      }
    });
    return off;
  }, [qc, channelId]);
}


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
    mutationFn: async ({ conversationId, text, attachments }: { conversationId: string; text: string; attachments?: { url: string; kind: string; name: string; size: number }[] }) =>
      messagesStore.send(conversationId, text, attachments),
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

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (peerId: string) => messagesStore.startWith(peerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
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
    mutationFn: async ({ channelId, text, attachments }: { channelId: string; text: string; attachments?: { url: string; kind: string; name: string; size: number }[] }) =>
      communitiesStore.postChannel(channelId, text, attachments),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["channel-messages", vars.channelId] }),
  });
}

export function useCommunityMembers(communityId: string) {
  return useQuery({
    queryKey: ["community-members", communityId],
    queryFn: async () => communitiesStore.members(communityId),
    staleTime: 0,
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
  const qc = useQueryClient();
  useEffect(() => {
    const off = socketBus.on(SocketEvents.NotificationNew, () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    });
    return off;
  }, [qc]);
  return useQuery({ queryKey: ["notifications", "unread"], queryFn: async () => notificationsStore.unreadCount(), staleTime: 5_000 });
}
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => notificationsStore.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
