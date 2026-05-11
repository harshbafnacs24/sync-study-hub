import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { Conversation } from "../../models/Conversation.js";
import { Message } from "../../models/Message.js";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

const startSchema = z.object({ peerId: z.string().min(1) });

conversationsRouter.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const list = await Conversation.find({ participants: req.userId }).sort({ lastMessageAt: -1 }).limit(100);
  res.json({ conversations: list });
}));

conversationsRouter.post("/", validate(startSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { peerId } = req.body as { peerId: string };
  const existing = await Conversation.findOne({ participants: { $all: [req.userId, peerId], $size: 2 } });
  if (existing) return res.json({ conversation: existing });
  const c = await Conversation.create({ participants: [req.userId!, peerId] });
  res.status(201).json({ conversation: c });
}));

const sendSchema = z.object({ text: z.string().min(1).max(4000) });

conversationsRouter.get("/:id/messages", asyncHandler(async (req: AuthedRequest, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const before = req.query.before as string | undefined;
  const filter: any = { conversationId: req.params.id };
  if (before) filter._id = { $lt: new mongoose.Types.ObjectId(before) };
  const items = await Message.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json({ messages: items.reverse() });
}));

conversationsRouter.post("/:id/messages", validate(sendSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  const msg = await Message.create({ conversationId: conv._id, senderId: req.userId, text: (req.body as any).text });
  conv.lastMessageAt = msg.createdAt;
  conv.lastPreview = msg.text.slice(0, 200);
  await conv.save();
  // emit via socket bus (wired in realtime/socket.ts when present)
  res.status(201).json({ message: msg });
}));

conversationsRouter.post("/:id/read", asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOneAndUpdate(
    { _id: req.params.id, participants: req.userId },
    { $set: { [`unread.${req.userId}`]: 0 } },
    { new: true },
  );
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  res.json({ conversation: conv });
}));

conversationsRouter.post("/:id/pin", asyncHandler(async (req: AuthedRequest, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, participants: req.userId });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  const pinned = conv.pinnedBy ?? [];
  conv.pinnedBy = pinned.includes(req.userId!) ? pinned.filter((u) => u !== req.userId) : [...pinned, req.userId!];
  await conv.save();
  res.json({ conversation: conv });
}));
