// Shared API types for Sync & Study.

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string | null;
  createdAt: string;
}

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export interface Profile {
  userId: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  school?: string | null;
  branch?: string | null;
  year?: string | null;
  gender?: Gender | null;
  subjects: string[];
  goals?: string | null;
  timezone?: string | null;
  updatedAt?: string;
  publicId?: string;
  profileCompleted?: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type ProfilePatch = Partial<
  Pick<Profile, "name" | "avatar" | "bio" | "school" | "branch" | "year" | "gender" | "subjects" | "goals" | "timezone">
>;

export interface ProfileSetupInput {
  name: string;
  school: string;
  branch: string;
  year: string;
  bio: string;
  subjects: string[];
  gender: Gender;
  avatar?: string;
}

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

export interface MessageAttachment {
  url: string;
  kind: string;
  name: string;
  size: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
  attachments?: MessageAttachment[];
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
  | "friend_request"
  | "friend_accepted"
  | "dm"
  | "comment"
  | "like"
  | "mention"
  | "community_invite"
  | "channel_message"
  | "session_reminder"
  | "task_due";

export interface FeedPost {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
    school: string;
  };
  likeCount: number;
  liked: boolean;
  commentCount: number;
}

export interface FeedComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; avatar?: string | null };
}

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
}
