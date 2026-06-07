import { api } from "../api-client";

export interface NetworkUser {
  id: string;
  userId: string;
  username: string;
  handle: string;
  name: string;
  initials: string;
  avatar: string | null;
  online: boolean;
  bio: string;
  interests: string[];
  school: string;
  branch?: string;
  year: string;
  mutualFriends?: number;
  goals: string;
  subject?: string;
  studyStreak?: number;
  totalHours?: number;
}

export interface Connection {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export const networkStore = {
  /* ── Users ── */
  async allUsers(): Promise<NetworkUser[]> {
    try {
      const { users } = await api.discoverUsers();
      return users;
    } catch (e) {
      console.error("Error fetching users:", e);
      return [];
    }
  },

  async getUser(id: string): Promise<NetworkUser | undefined> {
    try {
      const { user } = await api.getNetworkUser(id);
      return user;
    } catch {
      return undefined;
    }
  },

  async searchUsers(query: string): Promise<NetworkUser[]> {
    if (!query.trim()) return this.allUsers();
    try {
      const { users } = await api.searchUsers(query);
      return users;
    } catch (e) {
      console.error("Error searching users:", e);
      return [];
    }
  },

  async friends(): Promise<NetworkUser[]> {
    try {
      const { users } = await api.getFriends();
      return users;
    } catch (e) {
      console.error("Error fetching friends:", e);
      return [];
    }
  },

  async forYouUsers(): Promise<NetworkUser[]> {
    try {
      const { users } = await api.forYouUsers();
      return users;
    } catch (e) {
      console.error("Error fetching for-you users:", e);
      return [];
    }
  },

  async communityPeople(communityId: string): Promise<NetworkUser[]> {
    return this.allUsers();
  },

  /* ── Connections ── */
  async connections(): Promise<Connection[]> {
    try {
      const { connections } = await api.getConnections();
      return connections;
    } catch (e) {
      console.error("Error fetching connections:", e);
      return [];
    }
  },

  async sendRequest(toUserId: string): Promise<Connection> {
    const { connection } = await api.sendConnection(toUserId);
    return connection;
  },

  async acceptRequest(connectionId: string): Promise<void> {
    await api.updateConnection(connectionId, "accepted");
  },

  async removeConnection(connectionId: string): Promise<void> {
    await api.removeConnection(connectionId);
  },

  /* ── Block ── */
  async blockUser(userId: string): Promise<void> {
    await api.blockUser(userId);
  },

  async unblockUser(userId: string): Promise<void> {
    await api.unblockUser(userId);
  },

  async blockedIds(): Promise<string[]> {
    try {
      const { blockedIds } = await api.getBlocks();
      return blockedIds;
    } catch {
      return [];
    }
  },

  /* ── Reports ── */
  async reportUser(reportedUserId: string, reason: string, category = "other"): Promise<void> {
    await api.reportUser({ userId: reportedUserId, category, reason });
  },

  /* ── Quick Meet (localStorage backup) ── */
  quickMeets() {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem("net.quickmeets");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  scheduleQuickMeet(data: any) {
    if (typeof window === "undefined") return null;
    const session = {
      id: Math.random().toString(36).substring(2, 9),
      hostUserId: "me",
      createdAt: new Date().toISOString(),
      ...data,
    };
    const all = this.quickMeets();
    localStorage.setItem("net.quickmeets", JSON.stringify([...all, session]));
    return session;
  },

  deleteQuickMeet(id: string) {
    if (typeof window === "undefined") return;
    const all = this.quickMeets();
    localStorage.setItem("net.quickmeets", JSON.stringify(all.filter((q: any) => q.id !== id)));
  },
};
