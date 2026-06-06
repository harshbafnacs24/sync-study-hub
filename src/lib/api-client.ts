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
    return request<{ profile: Profile }>("/api/profile/me", { auth: true });
  },

  updateMyProfile: async (patch: ProfilePatch): Promise<{ profile: Profile }> => {
    return request<{ profile: Profile }>("/api/profile/me", {
      method: "PATCH",
      auth: true,
      body: JSON.stringify(patch),
    });
  },

  // Network discovery
  searchUsers: (q: string) =>
    request<{ users: any[] }>(`/api/v1/network/search?q=${encodeURIComponent(q)}`, { auth: true }),

  discoverUsers: (skip = 0, limit = 20) =>
    request<{ users: any[]; hasMore: boolean; nextSkip: number | null }>(
      `/api/v1/network/discover?skip=${skip}&limit=${limit}`,
      { auth: true },
    ),

  forYouUsers: () =>
    request<{ users: any[] }>("/api/v1/network/for-you", { auth: true }),

  getNetworkUser: (id: string) =>
    request<{ user: any }>(`/api/v1/network/user/${id}`, { auth: true }),

  // Block & Report
  blockUser: (userId: string) =>
    request<{ ok: boolean }>("/api/v1/network/block", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ userId }),
    }),

  unblockUser: (userId: string) =>
    request<{ ok: boolean }>(`/api/v1/network/block/${userId}`, {
      method: "DELETE",
      auth: true,
    }),

  getBlocks: () =>
    request<{ blockedIds: string[] }>("/api/v1/network/blocks", { auth: true }),

  reportUser: (data: { userId: string; category: string; reason: string; conversationId?: string }) =>
    request<{ ok: boolean }>("/api/v1/network/report", {
      method: "POST",
      auth: true,
      body: JSON.stringify(data),
    }),

  // Connections / Requests
  getConnections: () =>
    request<{ connections: any[] }>("/api/v1/network/connections", { auth: true }),

  sendConnection: (toUserId: string) =>
    request<{ connection: any }>("/api/v1/network/connections", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ toUserId }),
    }),

  updateConnection: (connectionId: string, status: "accepted" | "rejected") =>
    request<{ connection: any }>(`/api/v1/network/connections/${connectionId}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ status }),
    }),

  removeConnection: (connectionId: string) =>
    request<{ ok: boolean }>(`/api/v1/network/connections/${connectionId}`, {
      method: "DELETE",
      auth: true,
    }),

  // Messages - mark read and toggle pin
  markConversationRead: (conversationId: string) =>
    request<{ conversation: any }>(`/api/v1/conversations/${conversationId}/read`, {
      method: "POST",
      auth: true,
    }),

  toggleConversationPin: (conversationId: string) =>
    request<{ conversation: any }>(`/api/v1/conversations/${conversationId}/pin`, {
      method: "POST",
      auth: true,
    }),

  request: <T>(path: string, init?: RequestInit & { auth?: boolean }) =>
    request<T>(path, init),
};

export { ApiError };
