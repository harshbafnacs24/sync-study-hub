import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { networkStore } from "../store/network";
import { useAuth } from "../auth-context";
import { socketBus, SocketEvents } from "../socket";

export function useDiscoverUsers(skip = 0, limit = 20) {
  return useQuery({
    queryKey: ["network", "discover", skip, limit],
    queryFn: () => networkStore.discoverUsers(skip, limit),
    staleTime: 30000,
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ["network", "search", query],
    queryFn: () => networkStore.searchUsers(query),
    enabled: true,
    staleTime: 10000,
  });
}

export function useForYouUsers() {
  return useQuery({
    queryKey: ["network", "for-you"],
    queryFn: () => networkStore.forYouUsers(),
    staleTime: 60000,
  });
}

export function useNetworkUser(userId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const offOnline = socketBus.on(SocketEvents.PresenceOnline, () => {
      qc.invalidateQueries({ queryKey: ["network", "user", userId] });
      qc.invalidateQueries({ queryKey: ["network", "friends"] });
    });
    const offOffline = socketBus.on(SocketEvents.PresenceOffline, () => {
      qc.invalidateQueries({ queryKey: ["network", "user", userId] });
      qc.invalidateQueries({ queryKey: ["network", "friends"] });
    });
    return () => { offOnline(); offOffline(); };
  }, [qc, userId]);

  return useQuery({
    queryKey: ["network", "user", userId],
    queryFn: () => networkStore.getUser(userId),
    enabled: !!userId,
  });
}

export function useFriends() {
  return useQuery({
    queryKey: ["network", "friends"],
    queryFn: () => networkStore.friends(),
    staleTime: 30000,
  });
}

export function useConnections() {
  const qc = useQueryClient();
  useEffect(() => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["network", "connections"] });
      qc.invalidateQueries({ queryKey: ["network", "discover"] });
      qc.invalidateQueries({ queryKey: ["network", "friends"] });
    };
    const off1 = socketBus.on(SocketEvents.ConnectionRequest, invalidate);
    const off2 = socketBus.on(SocketEvents.ConnectionAccepted, invalidate);
    const off3 = socketBus.on(SocketEvents.ConnectionRemoved, invalidate);
    return () => { off1(); off2(); off3(); };
  }, [qc]);

  return useQuery({
    queryKey: ["network", "connections"],
    queryFn: () => networkStore.connections(),
  });
}

export function useConnectionStatus(targetUserId: string) {
  const { user } = useAuth();
  const { data: conns = [] } = useConnections();

  if (!user || user.id === targetUserId) return { status: "self", connectionId: null };

  const conn = conns.find(
    (c) =>
      (c.fromUserId === user.id && c.toUserId === targetUserId) ||
      (c.fromUserId === targetUserId && c.toUserId === user.id)
  );

  if (!conn) return { status: "none", connectionId: null };

  if (conn.status === "accepted") return { status: "connected", connectionId: conn.id };

  if (conn.status === "pending") {
    if (conn.fromUserId === user.id) {
      return { status: "outgoing_pending", connectionId: conn.id };
    } else {
      return { status: "incoming_pending", connectionId: conn.id };
    }
  }

  return { status: "none", connectionId: null };
}

export function useSendConnectionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (toUserId: string) => networkStore.sendRequest(toUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network", "connections"] });
    },
  });
}

export function useAcceptConnectionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => networkStore.acceptRequest(connectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network", "connections"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useRemoveConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => networkStore.removeConnection(connectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network", "connections"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => networkStore.blockUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network", "connections"] });
      qc.invalidateQueries({ queryKey: ["network", "discover"] });
      qc.invalidateQueries({ queryKey: ["network", "for-you"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => networkStore.unblockUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network", "discover"] });
    },
  });
}

export function useReportUser() {
  return useMutation({
    mutationFn: ({ userId, category, reason }: { userId: string; category: string; reason: string }) =>
      networkStore.reportUser(userId, reason, category),
  });
}

/* ── Quick Meet ──────────────────────────────────────────────────────────── */

export function useQuickMeets() {
  return useQuery({
    queryKey: ["quickmeets"],
    queryFn: () => networkStore.quickMeets(),
    staleTime: 0,
  });
}

export function useScheduleQuickMeet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      invitedUserId: string;
      title: string;
      link: string;
      scheduledAt: string;
    }) => {
      const session = networkStore.scheduleQuickMeet(data);
      return session;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quickmeets"] });
    },
  });
}

export function useDeleteQuickMeet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => networkStore.deleteQuickMeet(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quickmeets"] }),
  });
}
