// Shared API types for Sync & Study.

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string | null;
  createdAt: string;
}

export interface Profile {
  userId: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  school?: string | null;
  year?: string | null;
  subjects: string[];
  goals?: string | null;
  timezone?: string | null;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type ProfilePatch = Partial<
  Pick<Profile, "name" | "avatar" | "bio" | "school" | "year" | "subjects" | "goals" | "timezone">
>;

/* ============================================================
 * M3 — Messaging & Communities
 * ============================================================ */

export interface Peer {
  id: string;
  name: string;
  handle: string;
  initials: string;
  online: boolean;
  subject?: string;
  avatar?: string | null;
}

export interface Conversation {
  id: string;
  peerId: string;
  pinned: boolean;
  unread: number;
  lastMessageAt: string;
  lastPreview: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string; // peerId or "me"
  text: string;
  createdAt: string;
  read: boolean;
}

export type CommunityRole = "owner" | "admin" | "moderator" | "member";

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  members: number;
  iconChar: string;
  joined: boolean;
  trending?: boolean;
  recommended?: boolean;
}

export interface Channel {
  id: string;
  communityId: string;
  name: string; // without #
  topic?: string;
  pinned?: boolean;
  unread?: number;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  authorId: string; // peerId or "me"
  text: string;
  createdAt: string;
  system?: boolean;
}

export type NotificationKind =
  | "dm"
  | "mention"
  | "community_invite"
  | "channel_message"
  | "session_reminder"
  | "task_due";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
}
