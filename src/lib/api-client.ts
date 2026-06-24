import type { AuthResponse, Profile, ProfilePatch, ProfileSetupInput, AuthUser, FeedPost, FeedComment, TechFeedItem, PlatformStats } from "./types";
import { DEV_OFFLINE_MODE } from "./dev-mode";
import { storage } from "./store/storage";
import { SEED_NETWORK_USERS } from "./store/seed-archive";

/**
 * Base URL of the Sync & Study Express + MongoDB backend.
 * Defaults to http://localhost:4000 for local dev. Override with
 * VITE_API_BASE_URL when deploying.
 */
export const BACKEND_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";

export const API_BASE_URL =
  typeof window !== "undefined"
    ? ""
    : BACKEND_URL;

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

function getDemoPosts(): any[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem("sas.feed_posts");
  if (raw) return JSON.parse(raw);
  
  const seed = [
    {
      id: "post-1",
      authorId: "aanya_id",
      content: "Midterm prep has officially begun. Sliding window problems are starting to click! Who's up for a focus room session tonight? 📚🚀",
      mediaUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80",
      mediaType: "image",
      type: "post",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      author: { id: "aanya_id", name: "Aanya Mehta", avatar: "👩‍🎓", school: "LMN Tech" },
      likeCount: 12,
      liked: false,
      commentCount: 2,
      savesCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      saved: false,
      shared: false
    },
    {
      id: "post-2",
      authorId: "kabir_id",
      content: "Me writing React form hooks at 2 AM. Hydrated and locked in! 🐱💻☕",
      mediaUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3BndmdmM283OHZpdHhvbTh0cnNscjR2OHU3bzY2dnN6aWRnbWNnayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/33OrjzUFwkwEg/giphy.gif",
      mediaType: "gif",
      type: "post",
      createdAt: new Date(Date.now() - 14400000).toISOString(),
      author: { id: "kabir_id", name: "Kabir Singh", avatar: "👨‍🎓", school: "LMN Tech" },
      likeCount: 28,
      liked: false,
      commentCount: 2,
      savesCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      saved: false,
      shared: false
    },
    {
      id: "story-1",
      authorId: "kabir_id",
      content: "Setting up the new IDE theme. Custom keyboard is feeling crisp! ⌨️💻",
      mediaUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=600&q=80",
      mediaType: "image",
      type: "story",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      author: { id: "kabir_id", name: "Kabir Singh", avatar: "👨‍🎓", school: "LMN Tech" },
      likeCount: 0,
      liked: false,
      commentCount: 0,
      savesCount: 0,
      sharesCount: 0,
      viewsCount: 2,
      saved: false,
      shared: false
    },
    {
      id: "story-2",
      authorId: "aanya_id",
      content: "Cracking binary tree traversals before coffee gets cold. ☕🌳",
      mediaUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80",
      mediaType: "image",
      type: "story",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      author: { id: "aanya_id", name: "Aanya Mehta", avatar: "👩‍🎓", school: "LMN Tech" },
      likeCount: 0,
      liked: false,
      commentCount: 0,
      savesCount: 0,
      sharesCount: 0,
      viewsCount: 1,
      saved: false,
      shared: false
    },
    {
      id: "reel-1",
      authorId: "riya_id",
      content: "Sage AI has some suggestions. Study grind on AI models! 🤖✨",
      mediaUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmtlbjNuZnoxOHl6aThnZTR3cnR5bGVsbGlqZWV4ZXplMW13bzdhOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13HgwGsXF0aiGY/giphy.gif",
      mediaType: "gif",
      type: "reel",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      author: { id: "riya_id", name: "Riya Sharma", avatar: "👩‍🏫", school: "ABC College" },
      likeCount: 15,
      liked: false,
      commentCount: 1,
      savesCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      saved: false,
      shared: false
    }
  ];
  window.localStorage.setItem("sas.feed_posts", JSON.stringify(seed));
  return seed;
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
    const demoPosts = getDemoPosts();
    if (path.includes("/feed")) {
      return { posts: demoPosts.filter((p) => p.type === "post") };
    }
    if (path.includes("/stories")) {
      return { stories: demoPosts.filter((p) => p.type === "story") };
    }
    if (path.includes("/reels")) {
      return { reels: demoPosts.filter((p) => p.type === "reel") };
    }
    if (path.includes("/saved")) {
      return { posts: demoPosts.filter((p) => p.saves?.includes(currentUserId) || p.saved) };
    }
    if (method === "POST" && path.includes("/like")) {
      const parts = path.split("/");
      const postId = parts[parts.indexOf("posts") + 1];
      const idx = demoPosts.findIndex((p) => p.id === postId);
      if (idx !== -1) {
        demoPosts[idx].liked = !demoPosts[idx].liked;
        demoPosts[idx].likeCount += demoPosts[idx].liked ? 1 : -1;
        window.localStorage.setItem("sas.feed_posts", JSON.stringify(demoPosts));
        return { post: demoPosts[idx] };
      }
    }
    if (method === "POST" && path.includes("/save")) {
      const parts = path.split("/");
      const postId = parts[parts.indexOf("posts") + 1];
      const idx = demoPosts.findIndex((p) => p.id === postId);
      if (idx !== -1) {
        demoPosts[idx].saved = !demoPosts[idx].saved;
        demoPosts[idx].savesCount = (demoPosts[idx].savesCount ?? 0) + (demoPosts[idx].saved ? 1 : -1);
        if (!demoPosts[idx].saves) demoPosts[idx].saves = [];
        if (demoPosts[idx].saved) {
          demoPosts[idx].saves.push(currentUserId);
        } else {
          demoPosts[idx].saves = demoPosts[idx].saves.filter((id: string) => id !== currentUserId);
        }
        window.localStorage.setItem("sas.feed_posts", JSON.stringify(demoPosts));
        return { post: demoPosts[idx] };
      }
    }
    if (method === "POST" && path.includes("/share")) {
      const parts = path.split("/");
      const postId = parts[parts.indexOf("posts") + 1];
      const idx = demoPosts.findIndex((p) => p.id === postId);
      if (idx !== -1) {
        demoPosts[idx].shared = true;
        demoPosts[idx].sharesCount = (demoPosts[idx].sharesCount ?? 0) + 1;
        if (!demoPosts[idx].shares) demoPosts[idx].shares = [];
        demoPosts[idx].shares.push(currentUserId);
        window.localStorage.setItem("sas.feed_posts", JSON.stringify(demoPosts));
        return { post: demoPosts[idx] };
      }
    }
    if (method === "POST" && !path.includes("/comments")) {
      const body = JSON.parse(init.body || "{}");
      const newPost = {
        id: "post-" + Date.now(),
        authorId: currentUserId,
        content: body.content,
        mediaUrl: body.mediaUrl ?? null,
        mediaType: body.mediaType ?? null,
        type: body.type ?? "post",
        createdAt: new Date().toISOString(),
        author: { id: currentUserId, name: currentUser.name, avatar: currentUser.avatar ?? "🧑‍🎓", school: currentUser.school ?? "" },
        likeCount: 0,
        liked: false,
        commentCount: 0,
        savesCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        saved: false,
        shared: false
      };
      demoPosts.unshift(newPost);
      window.localStorage.setItem("sas.feed_posts", JSON.stringify(demoPosts));
      return { post: newPost };
    }
    return { posts: demoPosts, comments: [], ok: true };
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
      const convId = parts[parts.indexOf("conversations") + 1];
      const subpath = parts.slice(parts.indexOf("conversations") + 2).join("/");

      // Delete message: /api/v1/conversations/:id/messages/:messageId
      if (method === "DELETE" && subpath.startsWith("messages/")) {
        const msgId = subpath.split("/")[1];
        const index = msgs.findIndex((m) => m._id === msgId || m.id === msgId);
        if (index !== -1) {
          msgs.splice(index, 1);
          window.localStorage.setItem("sas.messages", JSON.stringify(msgs));
          return { ok: true };
        }
        throw new ApiError("Message not found", 404);
      }

      // React to message: /api/v1/conversations/:id/messages/:messageId/react
      if (method === "POST" && subpath.startsWith("messages/") && subpath.endsWith("/react")) {
        const msgId = subpath.split("/")[1];
        const { emoji } = JSON.parse(init.body || "{}");
        const idx = msgs.findIndex((m) => m._id === msgId || m.id === msgId);
        if (idx !== -1) {
          if (!msgs[idx].reactions) msgs[idx].reactions = {};
          if (!msgs[idx].reactions[emoji]) msgs[idx].reactions[emoji] = [];
          
          const users = msgs[idx].reactions[emoji];
          if (users.includes(currentUserId)) {
            msgs[idx].reactions[emoji] = users.filter((u: string) => u !== currentUserId);
            if (msgs[idx].reactions[emoji].length === 0) {
              delete msgs[idx].reactions[emoji];
            }
          } else {
            msgs[idx].reactions[emoji].push(currentUserId);
          }
          window.localStorage.setItem("sas.messages", JSON.stringify(msgs));
          return { message: msgs[idx] };
        }
        throw new ApiError("Message not found", 404);
      }

      // Poll voting: /api/v1/conversations/:id/messages/:messageId/poll/vote
      if (method === "POST" && subpath.startsWith("messages/") && subpath.endsWith("/poll/vote")) {
        const msgId = subpath.split("/")[1];
        const { optionIndex } = JSON.parse(init.body || "{}");
        const idx = msgs.findIndex((m) => m._id === msgId || m.id === msgId);
        if (idx !== -1) {
          const msgObj = msgs[idx];
          if (!msgObj.poll) throw new ApiError("Not a poll message", 400);
          
          msgObj.poll.options.forEach((opt: any, index: number) => {
            if (!opt.votes) opt.votes = [];
            if (index === optionIndex) {
              if (opt.votes.includes(currentUserId)) {
                opt.votes = opt.votes.filter((v: string) => v !== currentUserId);
              } else {
                opt.votes.push(currentUserId);
              }
            } else {
              opt.votes = opt.votes.filter((v: string) => v !== currentUserId);
            }
          });
          window.localStorage.setItem("sas.messages", JSON.stringify(msgs));
          return { message: msgObj };
        }
        throw new ApiError("Message not found", 404);
      }

      if (method === "POST") {
        const body = JSON.parse(init.body || "{}");
        const finalSenderId = body.senderId || currentUserId;
        
        let pollData = undefined;
        if (body.poll) {
          pollData = {
            question: body.poll.question,
            options: body.poll.options.map((o: string) => ({ text: o, votes: [] })),
            expiresAt: body.poll.expiresAt ? new Date(body.poll.expiresAt).toISOString() : undefined,
          };
        }

        const newMsg = {
          _id: "msg-" + Math.random().toString(36).slice(2, 9),
          id: "msg-" + Math.random().toString(36).slice(2, 9),
          conversationId: convId,
          senderId: finalSenderId,
          text: body.text,
          attachments: body.attachments ?? [],
          createdAt: new Date().toISOString(),
          readBy: [finalSenderId],
          replyToMessageId: body.replyToMessageId ?? null,
          isAnnouncement: body.isAnnouncement ?? false,
          reactions: {},
          poll: pollData,
        };
        msgs.push(newMsg);
        window.localStorage.setItem("sas.messages", JSON.stringify(msgs));
        
        // Update conversation preview
        const convIndex = convs.findIndex(c => c._id === convId || c.id === convId);
        if (convIndex !== -1) {
          convs[convIndex].lastPreview = body.text;
          convs[convIndex].lastMessageAt = new Date().toISOString();
          
          const otherParticipants = convs[convIndex].participants.filter((p: string) => p !== finalSenderId);
          if (otherParticipants.length > 0) {
            if (!convs[convIndex].unread) convs[convIndex].unread = {};
            for (const peer of otherParticipants) {
              convs[convIndex].unread[peer] = (convs[convIndex].unread[peer] ?? 0) + 1;
            }
          }
          window.localStorage.setItem("sas.conversations", JSON.stringify(convs));
        }
        return { message: newMsg };
      } else {
        const filtered = msgs.filter(m => m.conversationId === convId);
        return { messages: filtered };
      }
    }
    
    if (method === "GET") {
      const userConvs = convs.filter(c => c.participants.includes(currentUserId));
      return { conversations: userConvs };
    }
    if (method === "POST" && path.endsWith("/group")) {
      const { name, participants, avatar } = JSON.parse(init.body || "{}");
      const allParticipants = Array.from(new Set([...participants, currentUserId]));
      const newConv = {
        _id: "conv-group-" + Math.random().toString(36).slice(2, 9),
        id: "conv-group-" + Math.random().toString(36).slice(2, 9),
        participants: allParticipants,
        pinnedBy: [],
        unread: {},
        lastMessageAt: new Date().toISOString(),
        lastPreview: "Group created",
        isGroup: true,
        groupName: name,
        groupAvatar: avatar ?? "",
        createdBy: currentUserId,
      };
      convs.push(newConv);
      window.localStorage.setItem("sas.conversations", JSON.stringify(convs));
      return { conversation: newConv };
    }
    if (method === "POST") {
      const { peerId } = JSON.parse(init.body || "{}");
      let existing = convs.find(c => 
        c.participants.includes(currentUserId) && c.participants.includes(peerId) && !c.isGroup
      );
      if (!existing) {
        existing = {
          _id: "conv-" + Math.random().toString(36).slice(2, 9),
          id: "conv-" + Math.random().toString(36).slice(2, 9),
          participants: [currentUserId, peerId],
          pinnedBy: [],
          unread: {},
          lastMessageAt: new Date().toISOString(),
          lastPreview: "Say hi!",
          isGroup: false,
        };
        convs.push(existing);
        window.localStorage.setItem("sas.conversations", JSON.stringify(convs));
      }
      return { conversation: existing };
    }
  }

  if (path.startsWith("/api/v1/communities/channels/")) {
    if (path.includes("/poll/vote")) {
      const parts = path.split("/");
      const msgId = parts[parts.indexOf("messages") + 1];
      const { optionIndex } = JSON.parse(init.body || "{}");
      const idx = msgs.findIndex((m) => m._id === msgId || m.id === msgId);
      if (idx !== -1) {
        const msgObj = msgs[idx];
        if (!msgObj.poll) throw new ApiError("Not a poll message", 400);
        msgObj.poll.options.forEach((opt: any, index: number) => {
          if (!opt.votes) opt.votes = [];
          if (index === optionIndex) {
            if (opt.votes.includes(currentUserId)) {
              opt.votes = opt.votes.filter((v: string) => v !== currentUserId);
            } else {
              opt.votes.push(currentUserId);
            }
          } else {
            opt.votes = opt.votes.filter((v: string) => v !== currentUserId);
          }
        });
        window.localStorage.setItem("sas.messages", JSON.stringify(msgs));
        return { message: msgObj };
      }
      return { ok: true };
    }
  }

  if (path.startsWith("/api/v1/platform/trending")) {
    return { topics: ["DSA", "React", "AI/ML", "DBMS"], hackathons: [], posts: [] };
  }
  if (path.startsWith("/api/v1/platform/stats")) {
    return { stats: { studentsRegistered: 1200, universitiesConnected: 48, friendConnections: 320 } };
  }
  if (path.startsWith("/api/v1/tech-feed")) {
    if (path.includes("bookmarks")) return { items: [] };
    return { items: [] };
  }

  if (path.startsWith("/api/v1/notifications")) {
    if (path.includes("unread-count")) return { count: 0 };
    return { notifications: [] };
  }
  if (path.startsWith("/api/v1/sessions")) {
    return { sessions: [] };
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
    console.warn(`[api-client] API unreachable at ${API_BASE_URL}, using offline demo mode.`, err);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sas.demo_mode", "true");
    }
    return handleOfflineRequest(path, init) as T;
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && (data as any).error) ||
      `Request failed (${res.status})`;
    console.error(`[API Response Error] ${res.status} for ${path}:`, msg);
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
  getPost: (postId: string) =>
    request<{ post: FeedPost }>(`/api/v1/posts/${postId}`, { auth: true }),

  getFeed: (page = 1, limit = 15) =>
    request<{ posts: FeedPost[] }>(`/api/v1/posts/feed?page=${page}&limit=${limit}`, { auth: true }),

  getStories: () =>
    request<{ stories: FeedPost[] }>("/api/v1/posts/stories", { auth: true }),

  getReels: () =>
    request<{ reels: FeedPost[] }>("/api/v1/posts/reels", { auth: true }),

  getSavedPosts: () =>
    request<{ posts: FeedPost[] }>("/api/v1/posts/saved", { auth: true }),

  createPost: (content: string, media?: { mediaUrl: string; mediaType: "image" | "video" | "gif" }, type?: "post" | "story" | "reel") =>
    request<{ post: FeedPost }>("/api/v1/posts", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ content, ...media, type }),
    }),

  toggleSave: (postId: string) =>
    request<{ post: FeedPost }>(`/api/v1/posts/${postId}/save`, { method: "POST", auth: true }),

  toggleShare: (postId: string) =>
    request<{ post: FeedPost }>(`/api/v1/posts/${postId}/share`, { method: "POST", auth: true }),

  createGroupChat: (name: string, participants: string[], avatar?: string) =>
    request<{ conversation: any }>("/api/v1/conversations/group", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ name, participants, avatar }),
    }),

  deleteMessage: (conversationId: string, messageId: string) =>
    request<{ ok: boolean }>(`/api/v1/conversations/${conversationId}/messages/${messageId}`, {
      method: "DELETE",
      auth: true,
    }),

  reactToMessage: (conversationId: string, messageId: string, emoji: string) =>
    request<{ message: any }>(`/api/v1/conversations/${conversationId}/messages/${messageId}/react`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ emoji }),
    }),

  votePollMessage: (conversationId: string, messageId: string, optionIndex: number) =>
    request<{ message: any }>(`/api/v1/conversations/${conversationId}/messages/${messageId}/poll/vote`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ optionIndex }),
    }),

  voteChannelPollMessage: (channelId: string, messageId: string, optionIndex: number) =>
    request<{ message: any }>(`/api/v1/communities/channels/${channelId}/messages/${messageId}/poll/vote`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ optionIndex }),
    }),

  updateGroupMemberRole: (groupId: string, userId: string, role: string) =>
    request<{ ok: boolean }>(`/api/v1/communities/${groupId}/members/${userId}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ role }),
    }),

  kickGroupMember: (groupId: string, userId: string) =>
    request<{ ok: boolean }>(`/api/v1/communities/${groupId}/members/${userId}`, {
      method: "DELETE",
      auth: true,
    }),

  uploadPostMedia: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const token = tokenStore.get();
    const res = await fetch(`${API_BASE_URL}/api/v1/uploads/post`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data?.error ?? "Upload failed", res.status);
    return data as { file: { url: string; mediaType: "image" | "video" | "gif"; name: string } };
  },

  updatePost: (id: string, content: string, media?: { mediaUrl: string | null; mediaType: "image" | "video" | "gif" | null }) =>
    request<{ post: FeedPost }>(`/api/v1/posts/${id}`, {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({ content, ...media }),
    }),

  // Communities
  getCommunities: () =>
    request<{ communities: any[] }>("/api/v1/communities", { auth: true }),

  getCommunity: (id: string) =>
    request<{ community: any }>(`/api/v1/communities/${id}`, { auth: true }),

  createCommunity: (body: { name: string; description: string; category: string; tags: string[] }) =>
    request<{ community: any }>("/api/v1/communities", {
      method: "POST",
      auth: true,
      body: JSON.stringify(body),
    }),

  toggleCommunityJoin: (id: string) =>
    request<{ joined: boolean }>(`/api/v1/communities/${id}/join`, { method: "POST", auth: true }),

  getCommunityChannels: (id: string) =>
    request<{ channels: any[] }>(`/api/v1/communities/${id}/channels`, { auth: true }),

  getChannelMessages: (channelId: string) =>
    request<{ messages: any[] }>(`/api/v1/communities/channels/${channelId}/messages`, { auth: true }),

  sendChannelMessage: (channelId: string, text: string, attachments?: { url: string; kind: string; name: string; size: number }[]) =>
    request<{ message: any }>(`/api/v1/communities/channels/${channelId}/messages`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ text, attachments }),
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

  // File upload for community channels
  uploadChannelFile: async (channelId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const token = tokenStore.get();
    const res = await fetch(`${API_BASE_URL}/api/v1/uploads/channel/${channelId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data?.error ?? "Upload failed", res.status);
    return data as { file: { id: string; url: string; kind: string; name: string; size: number; mimeType: string } };
  },

  getCommunityMembers: (id: string) =>
    request<{ members: any[] }>(`/api/v1/communities/${id}/members`, { auth: true }),

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
