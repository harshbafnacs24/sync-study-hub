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
    socketBus.emit("channel:join", channelId);
    
    const off = socketBus.on(SocketEvents.ChannelMessage, (p: { channelId: string }) => {
      if (p?.channelId === channelId) {
        qc.invalidateQueries({ queryKey: ["channel-messages", channelId] });
      }
    });
    
    return () => {
      socketBus.emit("channel:leave", channelId);
      off();
    };
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
    mutationFn: async ({ conversationId, text, attachments, replyToMessageId, isAnnouncement, poll }: { conversationId: string; text: string; attachments?: { url: string; kind: string; name: string; size: number }[]; replyToMessageId?: string | null; isAnnouncement?: boolean; poll?: { question: string; options: string[] } }) =>
      messagesStore.send(conversationId, text, attachments, replyToMessageId, isAnnouncement, poll),
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

export function useCreateGroupChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, participants, avatar }: { name: string; participants: string[]; avatar?: string }) =>
      messagesStore.createGroup(name, participants, avatar),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      messagesStore.delete(conversationId, messageId),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["dms", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useReactToMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, messageId, emoji }: { conversationId: string; messageId: string; emoji: string }) =>
      messagesStore.react(conversationId, messageId, emoji),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["dms", vars.conversationId] });
    },
  });
}

export function useVoteDMPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, messageId, optionIndex }: { conversationId: string; messageId: string; optionIndex: number }) =>
      messagesStore.votePoll(conversationId, messageId, optionIndex),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["dms", vars.conversationId] });
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
    mutationFn: async ({ channelId, text, attachments, replyToMessageId, isAnnouncement, poll }: { channelId: string; text: string; attachments?: { url: string; kind: string; name: string; size: number }[]; replyToMessageId?: string | null; isAnnouncement?: boolean; poll?: { question: string; options: string[] } }) =>
      communitiesStore.postChannel(channelId, text, attachments, replyToMessageId, isAnnouncement, poll),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["channel-messages", vars.channelId] }),
  });
}

export function useVoteChannelPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, messageId, optionIndex }: { channelId: string; messageId: string; optionIndex: number }) =>
      communitiesStore.votePoll(channelId, messageId, optionIndex),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["channel-messages", vars.channelId] }),
      qc.invalidateQueries({ queryKey: ["community", vars.channelId] })
    },
  });
}

export function useUpdateGroupMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId, role }: { groupId: string; userId: string; role: string }) =>
      communitiesStore.updateMemberRole(groupId, userId, role),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["community-members", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["community", vars.groupId] });
    },
  });
}

export function useKickGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      communitiesStore.kickMember(groupId, userId),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["community-members", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["community", vars.groupId] });
    },
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
    mutationFn: async (input: { name: string; description: string; category: string; tags: string[]; iconChar?: string }) =>
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
