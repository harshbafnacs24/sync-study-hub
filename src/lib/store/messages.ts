import { storage, newId } from "./storage";
import { SEED_PEERS } from "./seed";
import type { Conversation, DirectMessage, Peer } from "../types";

const K_PEERS = "msg.peers";
const K_CONVS = "msg.conversations";
const K_MSGS  = "msg.messages";

function ensureSeed() {
  if (!storage.get<Peer[] | null>(K_PEERS, null)) storage.set(K_PEERS, SEED_PEERS);
  if (!storage.get<Conversation[] | null>(K_CONVS, null)) {
    const now = Date.now();
    const seed: Conversation[] = [
      { id: "cv_aanya", peerId: "p_aanya", pinned: true,  unread: 2, lastMessageAt: new Date(now - 1000 * 60 * 4).toISOString(),  lastPreview: "shared the recursion sheet — let's review at 6?" },
      { id: "cv_kabir", peerId: "p_kabir", pinned: false, unread: 0, lastMessageAt: new Date(now - 1000 * 60 * 42).toISOString(), lastPreview: "merged your PR. tests are green." },
      { id: "cv_riya",  peerId: "p_riya",  pinned: false, unread: 1, lastMessageAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(), lastPreview: "can you explain attention masks one more time?" },
      { id: "cv_arjun", peerId: "p_arjun", pinned: true,  unread: 0, lastMessageAt: new Date(now - 1000 * 60 * 60 * 26).toISOString(), lastPreview: "joined your focus room" },
    ];
    storage.set(K_CONVS, seed);
  }
  if (!storage.get<Record<string, DirectMessage[]> | null>(K_MSGS, null)) {
    const now = Date.now();
    const m = (id: string, conv: string, who: string, text: string, mAgo: number): DirectMessage => ({
      id, conversationId: conv, senderId: who, text, createdAt: new Date(now - mAgo * 60_000).toISOString(), read: true,
    });
    const seed: Record<string, DirectMessage[]> = {
      cv_aanya: [
        m("m1", "cv_aanya", "p_aanya", "Hey, you free for the recursion review?", 60),
        m("m2", "cv_aanya", "me",      "Yes — wrapping up a focus block.", 50),
        m("m3", "cv_aanya", "p_aanya", "I made a one-pager for the patterns.", 30),
        m("m4", "cv_aanya", "p_aanya", "shared the recursion sheet — let's review at 6?", 4),
      ],
      cv_kabir: [
        m("m5", "cv_kabir", "me",      "Pushed the auth refactor branch.", 90),
        m("m6", "cv_kabir", "p_kabir", "merged your PR. tests are green.", 42),
      ],
      cv_riya: [
        m("m7", "cv_riya", "p_riya", "can you explain attention masks one more time?", 180),
      ],
      cv_arjun: [
        m("m8", "cv_arjun", "p_arjun", "joined your focus room", 1560),
      ],
    };
    storage.set(K_MSGS, seed);
  }
}

export const messagesStore = {
  peers(): Peer[] { ensureSeed(); return storage.get<Peer[]>(K_PEERS, []); },
  peer(id: string): Peer | undefined { return messagesStore.peers().find((p) => p.id === id); },

  conversations(): Conversation[] {
    ensureSeed();
    const list = storage.get<Conversation[]>(K_CONVS, []);
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.lastMessageAt.localeCompare(a.lastMessageAt);
    });
  },

  conversation(id: string): Conversation | undefined {
    return messagesStore.conversations().find((c) => c.id === id);
  },

  messages(conversationId: string): DirectMessage[] {
    ensureSeed();
    const all = storage.get<Record<string, DirectMessage[]>>(K_MSGS, {});
    return all[conversationId] ?? [];
  },

  send(conversationId: string, text: string): DirectMessage {
    ensureSeed();
    const all = storage.get<Record<string, DirectMessage[]>>(K_MSGS, {});
    const msg: DirectMessage = {
      id: newId(),
      conversationId,
      senderId: "me",
      text,
      createdAt: new Date().toISOString(),
      read: true,
    };
    all[conversationId] = [...(all[conversationId] ?? []), msg];
    storage.set(K_MSGS, all);

    const convs = storage.get<Conversation[]>(K_CONVS, []);
    const idx = convs.findIndex((c) => c.id === conversationId);
    if (idx >= 0) {
      convs[idx] = { ...convs[idx], lastMessageAt: msg.createdAt, lastPreview: text, unread: 0 };
      storage.set(K_CONVS, convs);
    }
    return msg;
  },

  markRead(conversationId: string) {
    const convs = storage.get<Conversation[]>(K_CONVS, []);
    const idx = convs.findIndex((c) => c.id === conversationId);
    if (idx >= 0 && convs[idx].unread !== 0) {
      convs[idx] = { ...convs[idx], unread: 0 };
      storage.set(K_CONVS, convs);
    }
  },

  togglePin(conversationId: string) {
    const convs = storage.get<Conversation[]>(K_CONVS, []);
    const idx = convs.findIndex((c) => c.id === conversationId);
    if (idx >= 0) {
      convs[idx] = { ...convs[idx], pinned: !convs[idx].pinned };
      storage.set(K_CONVS, convs);
    }
  },

  startWith(peerId: string): Conversation {
    ensureSeed();
    const existing = messagesStore.conversations().find((c) => c.peerId === peerId);
    if (existing) return existing;
    const conv: Conversation = {
      id: newId(),
      peerId,
      pinned: false,
      unread: 0,
      lastMessageAt: new Date().toISOString(),
      lastPreview: "",
    };
    const convs = storage.get<Conversation[]>(K_CONVS, []);
    storage.set(K_CONVS, [conv, ...convs]);
    return conv;
  },
};
