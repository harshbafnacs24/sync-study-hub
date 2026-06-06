import type { AuthResponse, Profile, ProfilePatch, AuthUser } from "./types";
import { DEV_OFFLINE_MODE } from "./dev-mode";
import { storage } from "./store/storage";

/**
 * Base URL of the Sync & Study Express + MongoDB backend.
 * Defaults to http://localhost:4000 for local dev. Override with
 * VITE_API_BASE_URL when deploying.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";

const TOKEN_KEY = "ss.token";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = false, headers, ...rest } = init;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (auth) {
    const t = tokenStore.get();
    if (t) finalHeaders["Authorization"] = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers: finalHeaders });
  } catch {
    throw new ApiError(
      `Cannot reach API at ${API_BASE_URL}. Is the /server backend running?`,
      0,
    );
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && (data as any).error) ||
      `Request failed (${res.status})`;
    throw new ApiError(String(msg), res.status);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}

export const api = {
  signup: (body: { email: string; password: string; name: string }) =>
    request<AuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),

  google: (idToken: string) =>
    request<AuthResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),

  me: () => request<{ user: AuthUser }>("/api/auth/me", { auth: true }),

  getMyProfile: async (): Promise<{ profile: Profile }> => {
    if (DEV_OFFLINE_MODE) {
      const stored = storage.get<Profile | null>("profile", null);
      if (stored) return { profile: stored };
      const fresh: Profile = {
        userId: "dev-user",
        name: "Dev User",
        avatar: null, bio: null, school: null, year: null,
        subjects: [], goals: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        updatedAt: new Date().toISOString(),
      };
      storage.set("profile", fresh);
      return { profile: fresh };
    }
    return request<{ profile: Profile }>("/api/profile/me", { auth: true });
  },

  // ─── Users ──────────────────────────────────────────────────────────────
  searchUsers: (q: string) =>
    request<{ users: { id: string; name: string; email: string; avatar: string | null }[] }>(
      `/api/v1/users/search?q=${encodeURIComponent(q)}`, { auth: true }
    ),

  getUserProfile: (id: string) =>
    request<{ user: { id: string; name: string; email: string; avatar: string | null } }>(
      `/api/v1/users/${id}/profile`, { auth: true }
    ),

  // ─── Conversations / DMs ─────────────────────────────────────────────────
  getConversations: () =>
    request<{ conversations: ConversationWithPeer[] }>("/api/v1/conversations", { auth: true }),

  startConversation: (peerId: string) =>
    request<{ conversation: ConversationWithPeer }>("/api/v1/conversations", {
      method: "POST", auth: true, body: JSON.stringify({ peerId }),
    }),

  getMessages: (conversationId: string) =>
    request<{ messages: ApiMessage[] }>(`/api/v1/conversations/${conversationId}/messages`, { auth: true }),

  sendMessage: (conversationId: string, text: string) =>
    request<{ message: ApiMessage }>(`/api/v1/conversations/${conversationId}/messages`, {
      method: "POST", auth: true, body: JSON.stringify({ text }),
    }),

  markRead: (conversationId: string) =>
    request<{ ok: boolean }>(`/api/v1/conversations/${conversationId}/read`, { method: "POST", auth: true }),

  togglePin: (conversationId: string) =>
    request<void>(`/api/v1/conversations/${conversationId}/pin`, { method: "POST", auth: true }),

  // ─── Rooms ───────────────────────────────────────────────────────────────
  getRooms: () =>
    request<{ rooms: any[] }>("/api/v1/rooms", { auth: true }),

  createRoom: (body: { name: string; subject?: string | null; meetLink?: string | null; plannedMinutes?: number }) =>
    request<{ room: any }>("/api/v1/rooms", { method: "POST", auth: true, body: JSON.stringify(body) }),

  joinRoom: (inviteCode: string) =>
    request<{ room: any }>(`/api/v1/rooms/${inviteCode}/join`, { method: "POST", auth: true }),

  leaveRoom: (roomId: string) =>
    request<{ room: any }>(`/api/v1/rooms/${roomId}/leave`, { method: "POST", auth: true }),

  endRoom: (roomId: string) =>
    request<{ room: any }>(`/api/v1/rooms/${roomId}/end`, { method: "POST", auth: true }),

  // ─── Tasks ───────────────────────────────────────────────────────────────
  getTasks: () => request<{ tasks: any[] }>("/api/v1/tasks", { auth: true }),
  createTask: (body: any) => request<{ task: any }>("/api/v1/tasks", { method: "POST", auth: true, body: JSON.stringify(body) }),
  updateTask: (id: string, patch: any) => request<{ task: any }>(`/api/v1/tasks/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(patch) }),
  deleteTask: (id: string) => request<void>(`/api/v1/tasks/${id}`, { method: "DELETE", auth: true }),

  // ─── Analytics ───────────────────────────────────────────────────────────
  getAnalytics: () => request<any>("/api/v1/analytics/summary", { auth: true }),
  createSession: (session: any) => request<any>("/api/v1/sessions", { method: "POST", auth: true, body: JSON.stringify(session) }),

  // ─── Communities ─────────────────────────────────────────────────────────
  getCommunities: (params?: { q?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.category) qs.set("category", params.category);
    return request<{ communities: any[] }>(`/api/v1/communities?${qs}`, { auth: true });
  },
  getCommunity: (id: string) => request<{ community: any }>(`/api/v1/communities/${id}`, { auth: true }),
  createCommunity: (body: any) => request<{ community: any }>("/api/v1/communities", { method: "POST", auth: true, body: JSON.stringify(body) }),
  joinCommunity: (id: string) => request<{ joined: boolean }>(`/api/v1/communities/${id}/join`, { method: "POST", auth: true }),
  getChannels: (communityId: string) => request<{ channels: any[] }>(`/api/v1/communities/${communityId}/channels`, { auth: true }),
  getChannelMessages: (channelId: string) => request<{ messages: any[] }>(`/api/v1/communities/channels/${channelId}/messages`, { auth: true }),
  postChannelMessage: (channelId: string, text: string) =>
    request<{ message: any }>(`/api/v1/communities/channels/${channelId}/messages`, { method: "POST", auth: true, body: JSON.stringify({ text }) }),

  // ─── Notifications ────────────────────────────────────────────────────────
  getNotifications: () => request<{ notifications: any[] }>("/api/v1/notifications", { auth: true }),
  getUnreadCount: () => request<{ count: number }>("/api/v1/notifications/unread-count", { auth: true }),
  markAllNotificationsRead: () => request<{ ok: boolean }>("/api/v1/notifications/read-all", { method: "POST", auth: true }),

  // ─── Google Auth ─────────────────────────────────────────────────────────
  google: (idToken: string) =>
    request<{ token: string; user: any }>("/api/auth/google", {
      method: "POST", body: JSON.stringify({ idToken }),
    }),

    updateMyProfile: async (patch: ProfilePatch): Promise<{ profile: Profile }> => {
    if (DEV_OFFLINE_MODE) {
      const current = storage.get<Profile | null>("profile", null) ?? {
        userId: "dev-user", name: "Dev User", subjects: [],
      } as Profile;
      const next: Profile = { ...current, ...patch, subjects: patch.subjects ?? current.subjects ?? [], updatedAt: new Date().toISOString() };
      storage.set("profile", next);
      return { profile: next };
    }
    return request<{ profile: Profile }>("/api/profile/me", {
      method: "PATCH",
      auth: true,
      body: JSON.stringify(patch),
    });
  },
};

export { ApiError };

// ─── Shared API types ─────────────────────────────────────────────────────────

export interface ConversationWithPeer {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  peerOnline: boolean;
  pinned: boolean;
  unread: number;
  lastMessageAt: string;
  lastPreview: string;
}

export interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
}
