import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { Community } from "../../models/Community.js";
import { Channel } from "../../models/Channel.js";
import { CommunityMember } from "../../models/CommunityMember.js";
import { Message } from "../../models/Message.js";

export const communitiesRouter = Router();
communitiesRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(280).optional().default(""),
  category: z.string().min(1).max(40),
  tags: z.array(z.string().min(1).max(24)).max(8).default([]),
  iconChar: z.string().max(4).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

communitiesRouter.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const category = req.query.category as string | undefined;
  const filter: any = { visibility: "public" };
  if (category && category !== "All") filter.category = category;
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { tags: new RegExp(q, "i") }, { description: new RegExp(q, "i") }];
  const communities = await Community.find(filter).sort({ members: -1 }).limit(60);
  res.json({ communities });
}));

communitiesRouter.post("/", validate(createSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const body = req.body as z.infer<typeof createSchema>;
  const slug = slugify(body.name) || `c-${Date.now()}`;
  const community = await Community.create({ ...body, slug, iconChar: body.iconChar ?? body.name[0]?.toUpperCase() ?? "•", createdBy: req.userId, members: 1 });
  await CommunityMember.create({ communityId: community._id, userId: req.userId, role: "owner" });
  await Channel.insertMany(["general", "resources", "daily-progress", "questions", "session-links"].map((name) => ({
    communityId: community._id, name, createdBy: req.userId, topic: name === "general" ? "Community-wide chat" : "",
  })));
  res.status(201).json({ community });
}));

communitiesRouter.get("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const c = await Community.findOne({ $or: [{ _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }, { slug: req.params.id }] });
  if (!c) return res.status(404).json({ error: "Community not found" });
  res.json({ community: c });
}));

communitiesRouter.post("/:id/join", asyncHandler(async (req: AuthedRequest, res) => {
  const existing = await CommunityMember.findOne({ communityId: req.params.id, userId: req.userId });
  if (existing) {
    await existing.deleteOne();
    await Community.updateOne({ _id: req.params.id }, { $inc: { members: -1 } });
    return res.json({ joined: false });
  }
  await CommunityMember.create({ communityId: req.params.id, userId: req.userId, role: "member" });
  await Community.updateOne({ _id: req.params.id }, { $inc: { members: 1 } });
  res.json({ joined: true });
}));

communitiesRouter.get("/:id/channels", asyncHandler(async (req: AuthedRequest, res) => {
  const channels = await Channel.find({ communityId: req.params.id }).sort({ pinned: -1, name: 1 });
  res.json({ channels });
}));

const channelCreate = z.object({
  name: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/),
  topic: z.string().max(200).optional(),
});

communitiesRouter.post("/:id/channels", validate(channelCreate), asyncHandler(async (req: AuthedRequest, res) => {
  const member = await CommunityMember.findOne({ communityId: req.params.id, userId: req.userId });
  if (!member || !["owner", "admin", "moderator"].includes(member.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const channel = await Channel.create({ ...(req.body as any), communityId: req.params.id, createdBy: req.userId });
  res.status(201).json({ channel });
}));

communitiesRouter.get("/channels/:channelId/messages", asyncHandler(async (req: AuthedRequest, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const before = req.query.before as string | undefined;
  const filter: any = { channelId: req.params.channelId };
  if (before) filter._id = { $lt: new mongoose.Types.ObjectId(before) };
  const items = await Message.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json({ messages: items.reverse() });
}));

const channelSend = z.object({ text: z.string().min(1).max(4000) });

communitiesRouter.post("/channels/:channelId/messages", validate(channelSend), asyncHandler(async (req: AuthedRequest, res) => {
  const ch = await Channel.findById(req.params.channelId);
  if (!ch) return res.status(404).json({ error: "Channel not found" });
  const member = await CommunityMember.findOne({ communityId: ch.communityId, userId: req.userId });
  if (!member) return res.status(403).json({ error: "Join the community to post" });
  const msg = await Message.create({ channelId: ch._id, senderId: req.userId, text: (req.body as any).text });
  res.status(201).json({ message: msg });
}));
