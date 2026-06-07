import { Notification } from "../models/Notification.js";
import { emitToUser } from "../realtime/socket.js";

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

export async function createNotification(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string | null;
  payload?: Record<string, unknown>;
}) {
  const doc = await Notification.create({
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? "",
    href: input.href ?? null,
    read: false,
    payload: input.payload ?? {},
  });

  const serialized = {
    id: String(doc._id),
    kind: doc.kind,
    title: doc.title,
    body: doc.body,
    href: doc.href,
    read: doc.read,
    createdAt: doc.createdAt.toISOString(),
    payload: doc.payload,
  };

  emitToUser(input.userId, "notification:new", { notification: serialized });
  return serialized;
}
