import { storage, newId } from "./storage";
import type { AppNotification } from "../types";

const KEY = "notifs";

function ensureSeed() {
  const existing = storage.get<AppNotification[] | null>(KEY, null);
  if (existing) return;
  const now = Date.now();
  const seed: AppNotification[] = [
    { id: newId(), kind: "dm",                title: "Aanya Mehta",  body: "shared the recursion sheet — let's review at 6?", href: "/messages", createdAt: new Date(now - 4 * 60_000).toISOString(), read: false },
    { id: newId(), kind: "channel_message",   title: "#daily-progress", body: "Aanya posted in DSA Prep", href: "/communities/c_dsa/daily-progress", createdAt: new Date(now - 12 * 60_000).toISOString(), read: false },
    { id: newId(), kind: "session_reminder",  title: "Focus reminder", body: "Your 7pm DSA block starts in 15 minutes.", createdAt: new Date(now - 30 * 60_000).toISOString(), read: true },
    { id: newId(), kind: "community_invite",  title: "AI / ML Lab",   body: "Riya invited you to join AI / ML Lab.", href: "/communities/c_aiml", createdAt: new Date(now - 60 * 60_000).toISOString(), read: false },
  ];
  storage.set(KEY, seed);
}

export const notificationsStore = {
  list(): AppNotification[] {
    ensureSeed();
    return [...storage.get<AppNotification[]>(KEY, [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  unreadCount(): number { return notificationsStore.list().filter((n) => !n.read).length; },
  markAllRead() {
    const list = storage.get<AppNotification[]>(KEY, []).map((n) => ({ ...n, read: true }));
    storage.set(KEY, list);
  },
  markRead(id: string) {
    const list = storage.get<AppNotification[]>(KEY, []);
    const idx = list.findIndex((n) => n.id === id);
    if (idx >= 0) { list[idx] = { ...list[idx], read: true }; storage.set(KEY, list); }
  },
  push(n: Omit<AppNotification, "id" | "createdAt" | "read">) {
    const item: AppNotification = { ...n, id: newId(), createdAt: new Date().toISOString(), read: false };
    storage.set(KEY, [item, ...storage.get<AppNotification[]>(KEY, [])]);
    return item;
  },
};
