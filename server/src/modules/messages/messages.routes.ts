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
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const peerObjectId = new mongoose.Types.ObjectId(peerId);
  const conn = await Connection.findOne({
    $or: [
      { fromUserId: userObjectId, toUserId: peerObjectId, status: "accepted" },
      { fromUserId: peerObjectId, toUserId: userObjectId, status: "accepted" },
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
    replyToMessageId: m.replyToMessageId ?? null,
    isAnnouncement: m.isAnnouncement ?? false,
    reactions: m.reactions ? (m.reactions instanceof Map ? Object.fromEntries(m.reactions.entries()) : m.reactions) : {},
    poll: m.poll ?? null,
  };
}

function serializeConversation(c: any, currentUserId: string) {
  return {
    id: String(c._id),
    participants: c.participants,
    pinned: (c.pinnedBy ?? []).includes(currentUserId),
    lastMessageAt: c.lastMessageAt,
    lastPreview: c.lastPreview,
    unread: c.unread instanceof Map ? (c.unread.get(currentUserId) ?? 0) : (c.unread?.[currentUserId] ?? 0),
    isGroup: c.isGroup ?? false,
    groupName: c.groupName ?? "",
    groupAvatar: c.groupAvatar ?? "",
    createdBy: c.createdBy ?? null,
    peerId: c.participants.find((p: string) => p !== currentUserId) ?? null,
  };
}

conversationsRouter.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const list = await Conversation.find({ participants: req.userId }).sort({ lastMessageAt: -1 }).limit(100);
  res.json({ conversations: list.map((c) => serializeConversation(c, req.userId!)) });
}));

conversationsRouter.post("/", validate(startSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { peerId } = req.body as { peerId: string };
  if (req.userId === peerId) {
    return res.status(400).json({ error: "Cannot start a conversation with yourself" });
  }

  if (!(await areFriends(req.userId!, peerId))) {
    return res.status(403).json({ error: "You can only message friends" });
  }

  const userObjectId = new mongoose.Types.ObjectId(req.userId);
  const peerObjectId = new mongoose.Types.ObjectId(peerId);
  const blocked = await Block.findOne({
    $or: [
      { blockerId: userObjectId, blockedId: peerObjectId },
      { blockerId: peerObjectId, blockedId: userObjectId },
    ],
  });
  if (blocked) return res.status(403).json({ error: "Cannot message this user" });

  const existing = await Conversation.findOne({ participants: { $all: [req.userId, peerId], $size: 2 }, isGroup: false });
  if (existing) return res.json({ conversation: serializeConversation(existing, req.userId!) });
  const c = await Conversation.create({ participants: [req.userId!, peerId], lastMessageAt: new Date(), isGroup: false });
  res.status(201).json({ conversation: serializeConversation(c, req.userId!) });
}));

const sendSchema = z.object({
  text: z.string().min(1).max(4000),
  attachments: z.array(z.object({
    url: z.string(),
    kind: z.string(),
    name: z.string(),
    size: z.number(),
  })).optional(),
  replyToMessageId: z.string().optional().nullable(),
  isAnnouncement: z.boolean().optional(),
  poll: z.object({
    question: z.string(),
    options: z.array(z.string().min(1)),
    expiresAt: z.string().optional().nullable(),
  }).optional(),
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

  const body = req.body as z.infer<typeof sendSchema>;

  const otherParticipants = conv.participants.filter((p) => p !== req.userId);
  if (!conv.isGroup && otherParticipants.length > 0) {
    const otherParticipant = otherParticipants[0];
    if (!(await areFriends(req.userId!, otherParticipant))) {
      return res.status(403).json({ error: "You can only message friends" });
    }
    const userObjectId = new mongoose.Types.ObjectId(req.userId);
    const otherParticipantObjectId = new mongoose.Types.ObjectId(otherParticipant);
    const blocked = await Block.findOne({
      $or: [
        { blockerId: userObjectId, blockedId: otherParticipantObjectId },
        { blockerId: otherParticipantObjectId, blockedId: userObjectId },
      ],
    });
    if (blocked) return res.status(403).json({ error: "Cannot send message to this user" });
  }

  let pollData = undefined;
  if (body.poll) {
    pollData = {
      question: body.poll.question,
      options: body.poll.options.map((o: string) => ({ text: o, votes: [] })),
      expiresAt: body.poll.expiresAt ? new Date(body.poll.expiresAt) : undefined,
    };
  }

  const msg = await Message.create({
    conversationId: conv._id,
    senderId: req.userId,
    text: body.text,
    attachments: body.attachments ?? [],
    readBy: [req.userId!],
    replyToMessageId: body.replyToMessageId ?? null,
    isAnnouncement: body.isAnnouncement ?? false,
    poll: pollData,
  });

  conv.lastMessageAt = msg.createdAt;
  conv.lastPreview = body.text.slice(0, 200);
  
  const unreadMap = (conv.unread ?? new Map()) as any;
  for (const peer of otherParticipants) {
    const current = unreadMap instanceof Map ? (unreadMap.get(peer) ?? 0) : (unreadMap[peer] ?? 0);
    if (unreadMap instanceof Map) {
      unreadMap.set(peer, current + 1);
    } else {
      unreadMap[peer] = current + 1;
    }
  }
  conv.unread = unreadMap;
  await conv.save();

  const serialized = serializeMessage(msg);
  const senderProfile = await Profile.findOne({ userId: req.userId });

  for (const peer of otherParticipants) {
    emitToUser(peer, "message:new", { conversationId: String(conv._id), message: serialized });
    emitToUser(peer, "conversation:updated", { conversationId: String(conv._id) });

    await createNotification({
      userId: peer,
      kind: "dm",
      title: conv.isGroup ? `${conv.groupName} (${senderProfile?.name ?? "Member"})` : (senderProfile?.name ?? "New message"),
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
  res.json({ conversation: serializeConversation(conv, req.userId!) });
}));

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  avatar: z.string().optional(),
  participants: z.array(z.string().min(1)).min(1),
});

conversationsRouter.post("/group", validate(createGroupSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { name, avatar, participants } = req.body as { name: string; avatar?: string; participants: string[] };
  const allParticipants = Array.from(new Set([...participants, req.userId!]));
  
  const c = await Conversation.create({
    participants: allParticipants,
    isGroup: true,
    groupName: name,
    groupAvatar: avatar ?? "",
    createdBy: req.userId,
    lastMessageAt: new Date(),
    lastPreview: "Group created",
  });
  
  res.status(201).json({ conversation: serializeConversation(c, req.userId!) });
}));

conversationsRouter.delete("/:id/messages/:messageId", asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const msg = await Message.findOne({ _id: req.params.messageId, conversationId: conv._id });
  if (!msg) return res.status(404).json({ error: "Message not found" });

  if (msg.senderId !== req.userId) {
    return res.status(403).json({ error: "Cannot delete someone else's message" });
  }

  await msg.deleteOne();

  const otherParticipants = conv.participants.filter((p) => p !== req.userId);
  for (const peer of otherParticipants) {
    emitToUser(peer, "message:deleted", { conversationId: String(conv._id), messageId: String(msg._id) });
  }

  res.json({ ok: true });
}));

const reactSchema = z.object({ emoji: z.string().min(1) });
conversationsRouter.post("/:id/messages/:messageId/react", validate(reactSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const msg = await Message.findOne({ _id: req.params.messageId, conversationId: conv._id });
  if (!msg) return res.status(404).json({ error: "Message not found" });

  const { emoji } = req.body as { emoji: string };
  const currentReactions = msg.reactions ?? new Map();
  const users = currentReactions.get(emoji) ?? [];
  
  if (users.includes(req.userId!)) {
    const nextUsers = users.filter((u: string) => u !== req.userId);
    if (nextUsers.length === 0) {
      currentReactions.delete(emoji);
    } else {
      currentReactions.set(emoji, nextUsers);
    }
  } else {
    currentReactions.set(emoji, [...users, req.userId!]);
  }
  msg.reactions = currentReactions;
  await msg.save();

  const serialized = serializeMessage(msg);

  const otherParticipants = conv.participants.filter((p) => p !== req.userId);
  for (const peer of otherParticipants) {
    emitToUser(peer, "message:updated", { conversationId: String(conv._id), message: serialized });
  }

  res.json({ message: serialized });
}));

const voteSchema = z.object({ optionIndex: z.number().int() });
conversationsRouter.post("/:id/messages/:messageId/poll/vote", validate(voteSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const msg = await Message.findOne({ _id: req.params.messageId, conversationId: conv._id });
  if (!msg) return res.status(404).json({ error: "Message not found" });

  if (!msg.poll) return res.status(400).json({ error: "Message is not a poll" });

  const { optionIndex } = req.body as { optionIndex: number };
  if (optionIndex < 0 || optionIndex >= msg.poll.options.length) {
    return res.status(400).json({ error: "Invalid option index" });
  }

  const userId = req.userId!;
  msg.poll.options.forEach((opt, idx) => {
    const votes = opt.votes ?? [];
    if (idx === optionIndex) {
      if (votes.includes(userId)) {
        opt.votes = votes.filter((v) => v !== userId);
      } else {
        opt.votes = [...votes, userId];
      }
    } else {
      opt.votes = votes.filter((v) => v !== userId);
    }
  });

  msg.markModified("poll.options");
  await msg.save();

  const serialized = serializeMessage(msg);

  const otherParticipants = conv.participants.filter((p) => p !== req.userId);
  for (const peer of otherParticipants) {
    emitToUser(peer, "message:updated", { conversationId: String(conv._id), message: serialized });
  }

  res.json({ message: serialized });
}));
