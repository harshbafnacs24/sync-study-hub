import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { Conversation } from "../../models/Conversation.js";
import { Message } from "../../models/Message.js";
import { Profile } from "../../models/Profile.js";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

const startSchema = z.object({ peerId: z.string().min(1) });

function serializeConv(c: any, userId: string, profileMap: Map<string, any>) {
  const peerId = (c.participants as string[]).find((p) => p !== userId) ?? "";
  const peer = profileMap.get(peerId);
  const pinnedBy: string[] = c.pinnedBy ?? [];
  const unreadMap: Record<string, number> = c.unread instanceof Map
    ? Object.fromEntries(c.unread)
    : (c.unread ?? {});
  return {
    id: String(c._id),
    peerId,
    peerName: peer?.name ?? "Unknown User",
    peerAvatar: peer?.avatar ?? null,
    peerOnline: false, // real-time presence via Socket.IO
    pinned: pinnedBy.includes(userId),
    unread: unreadMap[userId] ?? 0,
    lastMessageAt: c.lastMessageAt?.toISOString?.() ?? new Date().toISOString(),
    lastPreview: c.lastPreview ?? "",
  };
}

function serializeMsg(m: any, myUserId: string) {
  return {
    id: String(m._id),
    conversationId: m.conversationId ? String(m.conversationId) : "",
    senderId: String(m.senderId) === myUserId ? "me" : String(m.senderId),
    text: m.text,
    createdAt: m.createdAt?.toISOString?.() ?? new Date().toISOString(),
    read: (m.readBy ?? []).includes(myUserId),
  };
}

conversationsRouter.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const list = await Conversation.find({ participants: req.userId }).sort({ lastMessageAt: -1 }).limit(100).lean();

  // Build peer ID set and fetch profiles in one query
  const peerIds = list
    .map((c: any) => (c.participants as string[]).find((p) => p !== req.userId))
    .filter(Boolean) as string[];

  const profiles = await Profile.find({ userId: { $in: peerIds } }).lean();
  const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

  res.json({ conversations: list.map((c) => serializeConv(c, req.userId!, profileMap)) });
}));

conversationsRouter.post("/", validate(startSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { peerId } = req.body as { peerId: string };
  const existing = await Conversation.findOne({ participants: { $all: [req.userId, peerId], $size: 2 } }).lean();

  const profiles = await Profile.find({ userId: { $in: [peerId] } }).lean();
  const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

  if (existing) return res.json({ conversation: serializeConv(existing, req.userId!, profileMap) });

  const c = await Conversation.create({ participants: [req.userId!, peerId] });
  const fresh = await Conversation.findById(c._id).lean();
  res.status(201).json({ conversation: serializeConv(fresh, req.userId!, profileMap) });
}));

const sendSchema = z.object({ text: z.string().min(1).max(4000) });

conversationsRouter.get("/:id/messages", asyncHandler(async (req: AuthedRequest, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const before = req.query.before as string | undefined;
  const filter: any = { conversationId: req.params.id };
  if (before) filter._id = { $lt: new mongoose.Types.ObjectId(before) };
  const items = await Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ messages: items.reverse().map((m) => serializeMsg(m, req.userId!)) });
}));

conversationsRouter.post("/:id/messages", validate(sendSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  const msg = await Message.create({ conversationId: conv._id, senderId: req.userId, text: (req.body as any).text });
  conv.lastMessageAt = msg.createdAt;
  conv.lastPreview = msg.text.slice(0, 200);
  await conv.save();
  res.status(201).json({ message: serializeMsg(msg, req.userId!) });
}));

conversationsRouter.post("/:id/read", asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOneAndUpdate(
    { _id: req.params.id, participants: req.userId },
    { $set: { [`unread.${req.userId}`]: 0 } },
    { new: true },
  );
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  res.json({ ok: true });
}));

conversationsRouter.post("/:id/pin", asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  const pinned = conv.pinnedBy ?? [];
  conv.pinnedBy = pinned.includes(req.userId!) ? pinned.filter((u) => u !== req.userId) : [...pinned, req.userId!];
  await conv.save();
  res.json({ ok: true });
}));
