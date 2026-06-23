import { api } from "../api-client";
import { socketBus, SocketEvents } from "../socket";
import type { Conversation, DirectMessage } from "../types";

export const messagesStore = {
  async conversations(): Promise<Conversation[]> {
    try {
      const { conversations } = await api.request<{ conversations: any[] }>("/api/v1/conversations", { auth: true });
      return (conversations ?? []).map(mapConversation);
    } catch (e) {
      console.error("Error loading conversations:", e);
      return [];
    }
  },

  async conversation(id: string): Promise<Conversation | undefined> {
    try {
      const list = await this.conversations();
      return list.find((c) => c.id === id);
    } catch {
      return undefined;
    }
  },

  async messages(conversationId: string): Promise<DirectMessage[]> {
    try {
      const { messages } = await api.request<{ messages: any[] }>(`/api/v1/conversations/${conversationId}/messages`, { auth: true });
      return (messages ?? []).map(mapMessage);
    } catch (e) {
      console.error("Error loading messages:", e);
      return [];
    }
  },

  async send(conversationId: string, text: string, attachments?: { url: string; kind: string; name: string; size: number }[], replyToMessageId?: string | null, isAnnouncement?: boolean, poll?: { question: string; options: string[] }): Promise<DirectMessage> {
    const { message } = await api.request<{ message: any }>(`/api/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ text, attachments, replyToMessageId, isAnnouncement, poll }),
    });
    const msg = mapMessage(message);
    socketBus.emit(SocketEvents.MessageNew, { conversationId, message: msg });
    socketBus.emit(SocketEvents.ConversationUpdated, { conversationId });
    return msg;
  },

  async startWith(peerId: string): Promise<Conversation> {
    const { conversation } = await api.request<{ conversation: any }>("/api/v1/conversations", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ peerId }),
    });
    return mapConversation(conversation);
  },

  async markRead(conversationId: string): Promise<void> {
    await api.markConversationRead(conversationId);
  },

  async togglePin(conversationId: string): Promise<void> {
    await api.toggleConversationPin(conversationId);
  },

  async sendAs(conversationId: string, senderId: string, text: string, options?: { read?: boolean }): Promise<DirectMessage> {
    const { message } = await api.request<{ message: any }>(`/api/v1/conversations/${conversationId}/messages/send-as`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ senderId, text, read: options?.read }),
    });
    const msg = mapMessage(message);
    socketBus.emit(SocketEvents.MessageNew, { conversationId, message: msg });
    socketBus.emit(SocketEvents.ConversationUpdated, { conversationId });
    return msg;
  },

  async createGroup(name: string, participants: string[], avatar?: string): Promise<Conversation> {
    const { conversation } = await api.createGroupChat(name, participants, avatar);
    return mapConversation(conversation);
  },

  async delete(conversationId: string, messageId: string): Promise<void> {
    await api.deleteMessage(conversationId, messageId);
  },

  async react(conversationId: string, messageId: string, emoji: string): Promise<DirectMessage> {
    const { message } = await api.reactToMessage(conversationId, messageId, emoji);
    return mapMessage(message);
  },

  async votePoll(conversationId: string, messageId: string, optionIndex: number): Promise<DirectMessage> {
    const { message } = await api.votePollMessage(conversationId, messageId, optionIndex);
    return mapMessage(message);
  },
};

function getLoggedInUserId(): string {
  try {
    const token = localStorage.getItem("ss.token") || localStorage.getItem("sas.auth_token");
    if (!token) return "";
    if (!token.includes('.')) {
      return token; // simple token is just the user ID in demo mode!
    }
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload).sub || JSON.parse(jsonPayload).id || "";
  } catch {
    return "";
  }
}

function mapConversation(c: any): Conversation {
  const currentUserId = getLoggedInUserId();
  const peerId = c.participants.find((p: any) => String(p) !== currentUserId);
  return {
    id: String(c._id || c.id),
    peerId: peerId ? String(peerId) : null, 
    pinned: Array.isArray(c.pinnedBy) && c.pinnedBy.some((p: any) => String(p) === currentUserId), 
    unread: typeof c.unread === "object" && c.unread ? (c.unread[currentUserId] ?? 0) : 0,
    lastMessageAt: c.lastMessageAt ?? new Date().toISOString(),
    lastPreview: c.lastPreview ?? "",
    isGroup: c.isGroup ?? false,
    groupName: c.groupName ?? "",
    groupAvatar: c.groupAvatar ?? "",
    createdBy: c.createdBy ?? null,
  };
}

function mapMessage(m: any): DirectMessage {
  const currentUserId = getLoggedInUserId();
  return {
    id: String(m._id || m.id),
    conversationId: String(m.conversationId),
    senderId: String(m.senderId),
    text: m.text,
    createdAt: m.createdAt,
    read: String(m.senderId) === currentUserId
      ? Array.isArray(m.readBy) && m.readBy.some((id: string) => id !== currentUserId)
      : false,
    attachments: m.attachments ?? [],
    replyToMessageId: m.replyToMessageId ?? null,
    isAnnouncement: m.isAnnouncement ?? false,
    reactions: m.reactions ?? {},
    poll: m.poll ?? null,
  };
}
