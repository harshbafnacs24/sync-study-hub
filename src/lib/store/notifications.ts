import { api } from "../api-client";
import type { AppNotification } from "../types";

export const notificationsStore = {
  async list(): Promise<AppNotification[]> {
    try {
      const { notifications } = await api.getNotifications();
      return (notifications ?? []).map((n: any) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        href: n.href ?? undefined,
        createdAt: n.createdAt,
        read: n.read,
      }));
    } catch {
      return [];
    }
  },

  async unreadCount(): Promise<number> {
    try {
      const { count } = await api.getUnreadNotificationCount();
      return count;
    } catch {
      return 0;
    }
  },

  async markAllRead(): Promise<void> {
    await api.markAllNotificationsRead();
  },

  async markRead(id: string): Promise<void> {
    await api.markNotificationRead(id);
  },
};
