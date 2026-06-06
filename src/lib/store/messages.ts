import { api } from "../api-client";
import { socketBus, SocketEvents } from "../socket";
import type { Conversation, DirectMessage } from "../types";

export const messagesStore = {
  async conversations(): Promise<Conversation[]> {
    try {
      const { conversations } = await api.request<{ conversations: any[] }>("/api/v1/conversations", { auth: true });
      return conversations.map(mapConversation);
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
      return messages.map(mapMessage);
    } catch (e) {
      console.error("Error loading messages:", e);
      return [];
    }
  },

  async send(conversationId: string, text: string): Promise<DirectMessage> {
    const { message } = await api.request<{ message: any }>(`/api/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ text }),
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
};

function mapConversation(c: any): Conversation {
  return {
    id: String(c._id),
    peerId: String(c.participants.find((p: any) => p !== "me")), // Frontend resolves peer info dynamically using networkStore or queries
    pinned: Array.isArray(c.pinnedBy) && c.pinnedBy.includes("me"), // backend logic uses userId
    unread: typeof c.unread === "object" && c.unread ? (c.unread["me"] ?? 0) : 0,
    lastMessageAt: c.lastMessageAt ?? new Date().toISOString(),
    lastPreview: c.lastPreview ?? "",
  };
}

function mapMessage(m: any): DirectMessage {
  return {
    id: String(m._id),
    conversationId: String(m.conversationId),
    senderId: String(m.senderId),
    text: m.text,
    createdAt: m.createdAt,
    read: Array.isArray(m.readBy) && m.readBy.length > 0,
  };
}
