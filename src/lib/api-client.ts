import type { AuthResponse, Profile, ProfilePatch, ProfileSetupInput, AuthUser, FeedPost, FeedComment, TechFeedItem, PlatformStats } from "./types";
import { DEV_OFFLINE_MODE } from "./dev-mode";
import { storage } from "./store/storage";
import { SEED_NETWORK_USERS } from "./store/seed-archive";

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

const MOCK_USER: AuthUser = {
  id: "dev-user",
  email: "dev@syncandstudy.local",
  name: "Dev User",
  createdAt: new Date().toISOString(),
} as AuthUser;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getCurrentUserId(): string {
  if (typeof window === "undefined") return "dev-user";
  const token = window.localStorage.getItem("ss.token");
  if (!token) return "dev-user";
  if (token.includes('.')) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload).sub || JSON.parse(jsonPayload).id || "dev-user";
    } catch {
      return "dev-user";
    }
  }
  return token;
}

function getDemoUsers(): any[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem("sas.demo_users");
  if (raw) return JSON.parse(raw);
  
  const avatarMap: Record<string, string> = {
    "dev-user": "🧑‍🎓",
    "aanya_id": "👩‍🎓",
    "kabir_id": "👨‍🎓",
    "riya_id": "👩‍🏫",
    "arjun_id": "👨‍💻",
    "meera_id": "👩‍💻"
  };

  const seedUsers = [
    {
      id: "dev-user",
      userId: "dev-user",
      username: "DevUser",
      handle: "dev_user",
      name: "Dev User",
      initials: "DU",
      avatar: avatarMap["dev-user"],
      email: "dev@syncandstudy.local",
      password: "password",
      online: true,
      bio: "Focused student | Sync & Study",
      school: "LMN Tech",
      year: "Sophomore",
      interests: ["DSA", "React"],
      goals: "Crack summer internship!",
      timezone: "UTC",
      createdAt: new Date().toISOString()
    },
    ...SEED_NETWORK_USERS.map(u => ({
      ...u,
      id: u.userId,
      avatar: avatarMap[u.userId] || null,
      email: `${u.handle}@syncandstudy.local`,
      password: "password",
      createdAt: new Date().toISOString()
    }))
  ];
  window.localStorage.setItem("sas.demo_users", JSON.stringify(seedUsers));
  return seedUsers;
}

function getDemoConnections(): any[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem("sas.connections");
  if (raw) return JSON.parse(raw);
  
  const seedConns = [
    {
      id: "conn-aanya",
      fromUserId: "aanya_id",
      toUserId: "dev-user",
      status: "pending",
      createdAt: new Date().toISOString()
    },
    {
      id: "conn-kabir",
      fromUserId: "kabir_id",
      toUserId: "dev-user",
      status: "accepted",
      createdAt: new Date().toISOString()
    }
  ];
  window.localStorage.setItem("sas.connections", JSON.stringify(seedConns));
  return seedConns;
}

function getDemoConversations(): any[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem("sas.conversations");
  if (raw) return JSON.parse(raw);
  
  const seedConvs = [
    {
      _id: "conv-kabir",
      participants: ["dev-user", "kabir_id"],
      pinnedBy: [],
      unread: { "dev-user": 0 },
      lastMessageAt: new Date().toISOString(),
      lastPreview: "let's sync after my next focus block."
    }
  ];
  window.localStorage.setItem("sas.conversations", JSON.stringify(seedConvs));
  return seedConvs;
}

function getDemoMessages(): any[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem("sas.messages");
  if (raw) return JSON.parse(raw);
  
  const seedMsgs = [
    {
      _id: "msg-1",
      conversationId: "conv-kabir",
      senderId: "kabir_id",
      text: "Hey, are you free for a study session?",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      readBy: []
    },
    {
      _id: "msg-2",
      conversationId: "conv-kabir",
      senderId: "dev-user",
      text: "Yeah, let's do it. What are you studying?",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      readBy: ["kabir_id"]
    },
    {
      _id: "msg-3",
      conversationId: "conv-kabir",
      senderId: "kabir_id",
      text: "let's sync after my next focus block.",
      createdAt: new Date(Date.now() - 600000).toISOString(),
      readBy: []
    }
  ];
  window.localStorage.setItem("sas.messages", JSON.stringify(seedMsgs));
  return seedMsgs;
}

function handleOfflineRequest(path: string, init: any): any {
  console.log(`[offline-api] Intercepted: ${init.method ?? "GET"} ${path}`);
  
  const method = init.method ?? "GET";
  const users = getDemoUsers();
  const conns = getDemoConnections();
  const convs = getDemoConversations();
  const msgs = getDemoMessages();
  const currentUserId = getCurrentUserId();
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  if (path.startsWith("/api/auth/me")) {
    return { user: currentUser };
  }
  
  if (path.startsWith("/api/auth/login")) {
    const { email, password } = JSON.parse(init.body || "{}");
    const user = users.find(u => u.email === email);
    if (!user || user.password !== password) {
      throw new ApiError("Invalid email or password", 401);
    }
    return { token: user.id, user };
  }
  
  if (path.startsWith("/api/auth/signup")) {
    const { email, password, name } = JSON.parse(init.body || "{}");
    const existing = users.find(u => u.email === email);
    if (existing) {
      throw new ApiError("Email already in use", 400);
    }
    const newUser = {
      id: "user-" + Math.random().toString(36).slice(2, 9),
      userId: "user-" + Math.random().toString(36).slice(2, 9),
      username: name.replace(/\s+/g, ""),
      handle: name.toLowerCase().replace(/\s+/g, "_"),
      name,
      initials: name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
      email,
      password,
      avatar: "🧑‍🎓",
      online: true,
      bio: "Focused student | Sync & Study",
      school: "LMN Tech",
      year: "Sophomore",
      interests: ["DSA"],
      goals: "Crack my exams!",
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    window.localStorage.setItem("sas.demo_users", JSON.stringify(users));
    return { token: newUser.id, user: newUser };
  }
  
  if (path.startsWith("/api/auth/google")) {
    return { token: currentUser.id, user: currentUser };
  }

  if (path.startsWith("/api/profile/setup")) {
    const body = JSON.parse(init.body || "{}");
    const updated = { ...currentUser, ...body, profileCompleted: true, updatedAt: new Date().toISOString() };
    const index = users.findIndex(u => u.id === currentUserId);
    if (index !== -1) {
      users[index] = updated;
      window.localStorage.setItem("sas.demo_users", JSON.stringify(users));
    }
    return { profile: updated };
  }

  if (path.startsWith("/api/profile/me") || path.startsWith("/api/profile/avatars")) {
    if (path.includes("/avatars")) {
      return { avatars: ["🧑‍🎓", "🧑‍💻", "🧑‍🏫"] };
    }
    if (method === "PATCH") {
      const patch = JSON.parse(init.body || "{}");
      const updated = { ...currentUser, ...patch, updatedAt: new Date().toISOString() };
      const index = users.findIndex(u => u.id === currentUserId);
      if (index !== -1) {
        users[index] = updated;
        window.localStorage.setItem("sas.demo_users", JSON.stringify(users));
      }
      return { profile: updated };
    } else {
      return { profile: { ...currentUser, profileCompleted: currentUser.profileCompleted ?? true } };
    }
  }

  if (path.startsWith("/api/v1/posts")) {
    if (path.includes("/feed")) return { posts: [] };
    if (method === "POST" && !path.includes("/comments") && !path.includes("/like")) {
      return { post: { id: "post-demo", authorId: currentUserId, content: JSON.parse(init.body || "{}").content, createdAt: new Date().toISOString(), author: { id: currentUserId, name: currentUser.name, avatar: currentUser.avatar, school: currentUser.school ?? "" }, likeCount: 0, liked: false, commentCount: 0 } };
    }
    return { posts: [], comments: [], ok: true };
  }

  if (path.startsWith("/api/v1/notifications")) {
    if (path.includes("unread-count")) return { count: 0 };
    if (path.includes("read-all")) return { ok: true };
    return { notifications: [] };
  }

  if (path.startsWith("/api/v1/network/friends")) {
    const friendIds = conns.filter(c => c.status === "accepted").map(c => c.fromUserId === currentUserId ? c.toUserId : c.fromUserId);
    return { users: users.filter(u => friendIds.includes(u.id)) };
  }

  if (path.startsWith("/api/v1/network/discover") || path.startsWith("/api/v1/network/search") || path.startsWith("/api/network/search")) {
    const q = new URLSearchParams(path.split("?")[1] || "").get("q") || "";
    let filtered = users.filter(u => u.id !== currentUserId);
    if (q) {
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(q.toLowerCase()) || 
        u.handle.toLowerCase().includes(q.toLowerCase()) ||
        u.interests?.some((i: string) => i.toLowerCase().includes(q.toLowerCase()))
      );
    }
    return { users: filtered, hasMore: false, nextSkip: null };
  }

  if (path.startsWith("/api/v1/network/for-you")) {
    const filtered = users.filter(u => u.id !== currentUserId);
    return { users: filtered.slice(0, 3) };
  }

  if (path.startsWith("/api/v1/network/user/")) {
    const userId = path.split("/").pop();
    const user = users.find(u => u.id === userId) || users[0];
    return { user };
  }

  if (path.startsWith("/api/v1/network/connections")) {
    if (method === "GET") {
      return { connections: conns };
    }
    if (method === "POST") {
      const { toUserId } = JSON.parse(init.body || "{}");
      const existing = conns.find(c => 
        (c.fromUserId === currentUserId && c.toUserId === toUserId) ||
        (c.fromUserId === toUserId && c.toUserId === currentUserId)
      );
      if (existing) return { connection: existing };
      
      const newConn = {
        id: "conn-" + Math.random().toString(36).slice(2, 9),
        fromUserId: currentUserId,
        toUserId,
        status: "pending",
        createdAt: new Date().toISOString()
      };
      conns.push(newConn);
      window.localStorage.setItem("sas.connections", JSON.stringify(conns));
      return { connection: newConn };
    }
    // PUT update status
    const parts = path.split("/");
    const connId = parts[parts.length - 1];
    const { status } = JSON.parse(init.body || "{}");
    const index = conns.findIndex(c => c.id === connId);
    if (index !== -1) {
      conns[index].status = status;
      window.localStorage.setItem("sas.connections", JSON.stringify(conns));
      
      // If accepted, automatically initialize conversation
      if (status === "accepted") {
        const conn = conns[index];
        const existingConv = convs.find(c => 
          c.participants.includes(conn.fromUserId) && c.participants.includes(conn.toUserId)
        );
        if (!existingConv) {
          const newConv = {
            _id: "conv-" + Math.random().toString(36).slice(2, 9),
            participants: [conn.fromUserId, conn.toUserId],
            pinnedBy: [],
            unread: {},
            lastMessageAt: new Date().toISOString(),
            lastPreview: "Say hi!"
          };
          convs.push(newConv);
          window.localStorage.setItem("sas.conversations", JSON.stringify(convs));
        }
      }
      return { connection: conns[index] };
    }
    return { ok: false };
  }

  if (path.startsWith("/api/v1/network/block")) {
    return { ok: true };
  }
  if (path.startsWith("/api/v1/network/blocks")) {
    return { blockedIds: [] };
  }
  if (path.startsWith("/api/v1/network/report")) {
    return { ok: true };
  }

  if (path.startsWith("/api/v1/conversations")) {
    if (path.includes("/messages")) {
      const parts = path.split("/");
      const convId = parts[parts.length - 2];
      
      if (method === "POST") {
        const { text, senderId, read } = JSON.parse(init.body || "{}");
        const finalSenderId = senderId || currentUserId;
        const newMsg = {
          _id: "msg-" + Math.random().toString(36).slice(2, 9),
          conversationId: convId,
          senderId: finalSenderId,
          text,
          createdAt: new Date().toISOString(),
          readBy: read ? [finalSenderId] : []
        };
        msgs.push(newMsg);
        window.localStorage.setItem("sas.messages", JSON.stringify(msgs));
        
        // Update conversation preview
        const convIndex = convs.findIndex(c => c._id === convId);
        if (convIndex !== -1) {
          convs[convIndex].lastPreview = text;
          convs[convIndex].lastMessageAt = new Date().toISOString();
          // increment unread for other participants
          const peerId = convs[convIndex].participants.find((p: string) => p !== finalSenderId);
          if (peerId) {
            if (!convs[convIndex].unread) convs[convIndex].unread = {};
            convs[convIndex].unread[peerId] = (convs[convIndex].unread[peerId] ?? 0) + 1;
          }
          window.localStorage.setItem("sas.conversations", JSON.stringify(convs));
        }
        return { message: newMsg };
      } else {
        // GET messages
        const filtered = msgs.filter(m => m.conversationId === convId);
        return { messages: filtered };
      }
    }
    
    // Conversations root endpoint
    if (method === "GET") {
      const userConvs = convs.filter(c => c.participants.includes(currentUserId));
      return { conversations: userConvs };
    }
    if (method === "POST") {
      const { peerId } = JSON.parse(init.body || "{}");
      let existing = convs.find(c => 
        c.participants.includes(currentUserId) && c.participants.includes(peerId)
      );
      if (!existing) {
        existing = {
          _id: "conv-" + Math.random().toString(36).slice(2, 9),
          participants: [currentUserId, peerId],
          pinnedBy: [],
          unread: {},
          lastMessageAt: new Date().toISOString(),
          lastPreview: "Say hi!"
        };
        convs.push(existing);
        window.localStorage.setItem("sas.conversations", JSON.stringify(convs));
      }
      return { conversation: existing };
    }
  }

  return { ok: true };
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  if (typeof window !== "undefined" && (window.localStorage.getItem("sas.demo_mode") === "true" || window.sessionStorage.getItem("sas.demo_mode") === "true")) {
    return handleOfflineRequest(path, init) as T;
  }
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
  } catch (err) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("sas.demo_mode", "true");
    }
    console.warn(`[api-client] Cannot reach API at ${API_BASE_URL}. Automatically switching to offline Demo Mode.`, err);
    return handleOfflineRequest(path, init) as T;
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

  setupProfile: (body: ProfileSetupInput) =>
    request<{ profile: Profile }>("/api/profile/setup", {
      method: "POST",
      auth: true,
      body: JSON.stringify(body),
    }),

  getAvatarOptions: () =>
    request<{ avatars: string[] }>("/api/profile/avatars", { auth: true }),

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

  getFriends: () =>
    request<{ users: any[] }>("/api/v1/network/friends", { auth: true }),

  // Posts / Feed
  getFeed: () =>
    request<{ posts: FeedPost[] }>("/api/v1/posts/feed", { auth: true }),

  createPost: (content: string) =>
    request<{ post: FeedPost }>("/api/v1/posts", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ content }),
    }),

  updatePost: (id: string, content: string) =>
    request<{ post: FeedPost }>(`/api/v1/posts/${id}`, {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({ content }),
    }),

  deletePost: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/posts/${id}`, { method: "DELETE", auth: true }),

  toggleLike: (postId: string) =>
    request<{ post: FeedPost }>(`/api/v1/posts/${postId}/like`, { method: "POST", auth: true }),

  getComments: (postId: string) =>
    request<{ comments: FeedComment[] }>(`/api/v1/posts/${postId}/comments`, { auth: true }),

  addComment: (postId: string, content: string) =>
    request<{ comment: FeedComment }>(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ content }),
    }),

  // Notifications
  getNotifications: () =>
    request<{ notifications: any[] }>("/api/v1/notifications", { auth: true }),

  getUnreadNotificationCount: () =>
    request<{ count: number }>("/api/v1/notifications/unread-count", { auth: true }),

  markAllNotificationsRead: () =>
    request<{ ok: boolean }>("/api/v1/notifications/read-all", { method: "POST", auth: true }),

  markNotificationRead: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/notifications/${id}/read`, { method: "POST", auth: true }),

  // File upload for chat
  uploadChatFile: async (conversationId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const token = tokenStore.get();
    const res = await fetch(`${API_BASE_URL}/api/v1/uploads/chat/${conversationId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data?.error ?? "Upload failed", res.status);
    return data as { file: { id: string; url: string; kind: string; name: string; size: number; mimeType: string } };
  },

  // Tech Feed
  getTechFeed: (type?: string, category?: string) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    const q = params.toString();
    return request<{ items: TechFeedItem[] }>(`/api/v1/tech-feed${q ? `?${q}` : ""}`, { auth: true });
  },

  getTechBookmarks: () =>
    request<{ items: TechFeedItem[] }>("/api/v1/tech-feed/bookmarks", { auth: true }),

  toggleTechLike: (id: string) =>
    request<{ item: TechFeedItem }>(`/api/v1/tech-feed/${id}/like`, { method: "POST", auth: true }),

  toggleTechBookmark: (id: string) =>
    request<{ item: TechFeedItem }>(`/api/v1/tech-feed/${id}/bookmark`, { method: "POST", auth: true }),

  getPlatformStats: () =>
    request<{ stats: PlatformStats }>("/api/v1/platform/stats"),

  getTrending: () =>
    request<{ topics: string[]; hackathons: any[]; posts: any[] }>("/api/v1/platform/trending"),

  request: <T>(path: string, init?: RequestInit & { auth?: boolean }) =>
    request<T>(path, init),
};

export { ApiError };
