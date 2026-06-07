import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { Conversation } from "../../models/Conversation.js";
import { Message } from "../../models/Message.js";
import { Block } from "../../models/Block.js";
import { Connection } from "../../models/Connection.js";
import { Profile } from "../../models/Profile.js";
import { emitToUser } from "../../realtime/socket.js";
import { createNotification } from "../../lib/notifications.js";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

const startSchema = z.object({ peerId: z.string().min(1) });

async function areFriends(userId: string, peerId: string): Promise<boolean> {
  const conn = await Connection.findOne({
    $or: [
      { fromUserId: userId, toUserId: peerId, status: "accepted" },
      { fromUserId: peerId, toUserId: userId, status: "accepted" },
    ],
  });
  return !!conn;
}

function serializeMessage(m: any) {
  return {
    _id: m._id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    text: m.text,
    attachments: m.attachments ?? [],
    readBy: m.readBy ?? [],
    createdAt: m.createdAt,
  };
}

conversationsRouter.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const list = await Conversation.find({ participants: req.userId }).sort({ lastMessageAt: -1 }).limit(100);
  res.json({ conversations: list });
}));

conversationsRouter.post("/", validate(startSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { peerId } = req.body as { peerId: string };
  if (req.userId === peerId) {
    return res.status(400).json({ error: "Cannot start a conversation with yourself" });
  }

  if (!(await areFriends(req.userId!, peerId))) {
    return res.status(403).json({ error: "You can only message friends" });
  }

  const blocked = await Block.findOne({
    $or: [
      { blockerId: req.userId, blockedId: peerId },
      { blockerId: peerId, blockedId: req.userId },
    ],
  });
  if (blocked) return res.status(403).json({ error: "Cannot message this user" });

  const existing = await Conversation.findOne({ participants: { $all: [req.userId, peerId], $size: 2 } });
  if (existing) return res.json({ conversation: existing });
  const c = await Conversation.create({ participants: [req.userId!, peerId], lastMessageAt: new Date() });
  res.status(201).json({ conversation: c });
}));

const sendSchema = z.object({
  text: z.string().min(1).max(4000),
  attachments: z.array(z.object({
    url: z.string(),
    kind: z.string(),
    name: z.string(),
    size: z.number(),
  })).optional(),
});

conversationsRouter.get("/:id/messages", asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const before = req.query.before as string | undefined;
  const filter: any = { conversationId: req.params.id };
  if (before) filter._id = { $lt: new mongoose.Types.ObjectId(before) };
  const items = await Message.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json({ messages: items.reverse().map(serializeMessage) });
}));

conversationsRouter.post("/:id/messages", validate(sendSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const otherParticipant = conv.participants.find((p) => p !== req.userId);
  if (otherParticipant) {
    if (!(await areFriends(req.userId!, otherParticipant))) {
      return res.status(403).json({ error: "You can only message friends" });
    }
    const blocked = await Block.findOne({
      $or: [
        { blockerId: req.userId, blockedId: otherParticipant },
        { blockerId: otherParticipant, blockedId: req.userId },
      ],
    });
    if (blocked) return res.status(403).json({ error: "Cannot send message to this user" });
  }

  const body = req.body as z.infer<typeof sendSchema>;
  const msg = await Message.create({
    conversationId: conv._id,
    senderId: req.userId,
    text: body.text,
    attachments: body.attachments ?? [],
    readBy: [req.userId!],
  });

  conv.lastMessageAt = msg.createdAt;
  conv.lastPreview = body.text.slice(0, 200);
  if (otherParticipant) {
    const unreadMap = conv.unread ?? new Map();
    const current = unreadMap.get(otherParticipant) ?? 0;
    unreadMap.set(otherParticipant, current + 1);
    conv.unread = unreadMap;
  }
  await conv.save();

  const serialized = serializeMessage(msg);

  if (otherParticipant) {
    emitToUser(otherParticipant, "message:new", { conversationId: String(conv._id), message: serialized });
    emitToUser(otherParticipant, "conversation:updated", { conversationId: String(conv._id) });

    const senderProfile = await Profile.findOne({ userId: req.userId });
    await createNotification({
      userId: otherParticipant,
      kind: "dm",
      title: senderProfile?.name ?? "New message",
      body: body.text.slice(0, 120),
      href: `/messages/dm/${conv._id}`,
      payload: { conversationId: String(conv._id) },
    });
  }

  res.status(201).json({ message: serialized });
}));

conversationsRouter.post("/:id/read", asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  await Conversation.findOneAndUpdate(
    { _id: req.params.id, participants: req.userId },
    { $set: { [`unread.${req.userId}`]: 0 } },
    { new: true },
  );

  const otherParticipant = conv.participants.find((p) => p !== req.userId);
  await Message.updateMany(
    { conversationId: conv._id, senderId: { $ne: req.userId }, readBy: { $ne: req.userId } },
    { $addToSet: { readBy: req.userId } },
  );

  if (otherParticipant) {
    emitToUser(otherParticipant, "message:read", {
      conversationId: String(conv._id),
      readBy: req.userId,
    });
  }

  const updated = await Conversation.findById(conv._id);
  res.json({ conversation: updated });
}));

conversationsRouter.post("/:id/pin", asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  const pinned = conv.pinnedBy ?? [];
  conv.pinnedBy = pinned.includes(req.userId!) ? pinned.filter((u) => u !== req.userId) : [...pinned, req.userId!];
  await conv.save();
  res.json({ conversation: conv });
}));
