import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { Community } from "../../models/Community.js";
import { Channel } from "../../models/Channel.js";
import { CommunityMember } from "../../models/CommunityMember.js";
import { Message } from "../../models/Message.js";
import { Profile } from "../../models/Profile.js";
import { getIO } from "../../realtime/socket.js";

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

function serializeCommunity(c: any, joined = false) {
  return {
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    category: c.category,
    tags: c.tags ?? [],
    members: c.members ?? 0,
    iconChar: c.iconChar ?? "•",
    joined,
    trending: (c.members ?? 0) >= 10,
    recommended: false,
  };
}

communitiesRouter.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const category = req.query.category as string | undefined;
  const filter: any = { visibility: "public" };
  if (category && category !== "All") filter.category = category;
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { tags: new RegExp(q, "i") }, { description: new RegExp(q, "i") }];
  const communities = await Community.find(filter).sort({ members: -1 }).limit(60);
  const memberships = await CommunityMember.find({
    userId: req.userId,
    communityId: { $in: communities.map((c) => c._id) },
  });
  const joinedIds = new Set(memberships.map((m) => String(m.communityId)));
  res.json({
    communities: communities.map((c) => serializeCommunity(c, joinedIds.has(String(c._id)))),
  });
}));

communitiesRouter.post("/", validate(createSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const body = req.body as z.infer<typeof createSchema>;
  const slug = slugify(body.name) || `c-${Date.now()}`;
  const community = await Community.create({ ...body, slug, iconChar: body.iconChar ?? body.name[0]?.toUpperCase() ?? "•", createdBy: req.userId, members: 1 });
  await CommunityMember.create({ communityId: community._id, userId: req.userId, role: "owner" });
  await Channel.insertMany(["general", "resources", "daily-progress", "questions", "session-links"].map((name) => ({
    communityId: community._id, name, createdBy: req.userId, topic: name === "general" ? "Community-wide chat" : "",
  })));
  res.status(201).json({ community: serializeCommunity(community, true) });
}));

communitiesRouter.get("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const c = await Community.findOne({ $or: [{ _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }, { slug: req.params.id }] });
  if (!c) return res.status(404).json({ error: "Community not found" });
  const member = await CommunityMember.findOne({ communityId: c._id, userId: req.userId });
  res.json({ community: serializeCommunity(c, !!member) });
}));

communitiesRouter.post("/:id/join", asyncHandler(async (req: AuthedRequest, res) => {
  const community = await Community.findOne({
    $or: [{ _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }, { slug: req.params.id }],
  });
  if (!community) return res.status(404).json({ error: "Community not found" });

  const existing = await CommunityMember.findOne({ communityId: community._id, userId: req.userId });
  if (existing) {
    await existing.deleteOne();
    await Community.updateOne({ _id: community._id }, { $inc: { members: -1 } });
    return res.json({ joined: false });
  }
  await CommunityMember.create({ communityId: community._id, userId: req.userId, role: "member" });
  await Community.updateOne({ _id: community._id }, { $inc: { members: 1 } });
  res.json({ joined: true });
}));

communitiesRouter.get("/:id/members", asyncHandler(async (req: AuthedRequest, res) => {
  const community = await Community.findOne({
    $or: [{ _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }, { slug: req.params.id }],
  });
  if (!community) return res.status(404).json({ error: "Community not found" });

  const members = await CommunityMember.find({ communityId: community._id });
  const profiles = await Profile.find({ userId: { $in: members.map((m) => new mongoose.Types.ObjectId(m.userId)) } });

  res.json({
    members: members.map((m) => {
      const prof = profiles.find((p) => String(p.userId) === String(m.userId));
      return {
        userId: String(m.userId),
        role: m.role,
        joinedAt: m.joinedAt,
        name: prof?.name ?? "Unknown Student",
        avatar: prof?.avatar ?? null,
      };
    }),
  });
}));

communitiesRouter.get("/:id/channels", asyncHandler(async (req: AuthedRequest, res) => {
  const community = await Community.findOne({
    $or: [{ _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }, { slug: req.params.id }],
  });
  if (!community) return res.status(404).json({ error: "Community not found" });
  const channels = await Channel.find({ communityId: community._id }).sort({ pinned: -1, name: 1 });
  res.json({
    channels: channels.map((ch) => ({
      id: String(ch._id),
      communityId: String(ch.communityId),
      name: ch.name,
      topic: ch.topic ?? undefined,
      pinned: ch.pinned ?? false,
    })),
  });
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
  res.json({
    messages: items.reverse().map((m) => ({
      id: String(m._id),
      channelId: String(m.channelId),
      authorId: String(m.senderId),
      text: m.text,
      attachments: m.attachments ?? [],
      createdAt: m.createdAt?.toISOString?.() ?? new Date().toISOString(),
      system: m.system ?? false,
      replyToMessageId: m.replyToMessageId ?? null,
      isAnnouncement: m.isAnnouncement ?? false,
      reactions: m.reactions ? (m.reactions instanceof Map ? Object.fromEntries(m.reactions.entries()) : m.reactions) : {},
      poll: m.poll ?? null,
    })),
  });
}));

const channelSend = z.object({
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

communitiesRouter.post("/channels/:channelId/messages", validate(channelSend), asyncHandler(async (req: AuthedRequest, res) => {
  const ch = await Channel.findById(req.params.channelId);
  if (!ch) return res.status(404).json({ error: "Channel not found" });
  const member = await CommunityMember.findOne({ communityId: ch.communityId, userId: req.userId });
  if (!member) return res.status(403).json({ error: "Join the community to post" });
  
  const body = req.body as any;
  let pollData = undefined;
  if (body.poll) {
    pollData = {
      question: body.poll.question,
      options: body.poll.options.map((o: string) => ({ text: o, votes: [] })),
      expiresAt: body.poll.expiresAt ? new Date(body.poll.expiresAt) : undefined,
    };
  }

  const msg = await Message.create({
    channelId: ch._id,
    senderId: req.userId,
    text: body.text,
    attachments: body.attachments ?? [],
    replyToMessageId: body.replyToMessageId ?? null,
    isAnnouncement: body.isAnnouncement ?? false,
    poll: pollData,
  });

  const serialized = {
    id: String(msg._id),
    channelId: String(msg.channelId),
    authorId: String(msg.senderId),
    text: msg.text,
    attachments: msg.attachments ?? [],
    createdAt: msg.createdAt?.toISOString?.() ?? new Date().toISOString(),
    system: false,
    replyToMessageId: msg.replyToMessageId ?? null,
    isAnnouncement: msg.isAnnouncement ?? false,
    reactions: {},
    poll: msg.poll ?? null,
  };

  const io = getIO();
  if (io) {
    io.to(`channel:${ch._id}`).emit("channel:message", {
      channelId: String(ch._id),
      message: serialized,
    });
  }

  res.status(201).json({ message: serialized });
}));

const updateRoleSchema = z.object({ role: z.enum(["admin", "moderator", "member"]) });
communitiesRouter.put("/:id/members/:userId", validate(updateRoleSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const callerMember = await CommunityMember.findOne({ communityId: req.params.id, userId: req.userId });
  if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const { role } = req.body as { role: "admin" | "moderator" | "member" };
  if (role === "admin" && callerMember.role !== "owner") {
    return res.status(403).json({ error: "Only the owner can promote someone to Admin" });
  }

  const targetMember = await CommunityMember.findOne({ communityId: req.params.id, userId: req.params.userId });
  if (!targetMember) return res.status(404).json({ error: "Member not found" });

  if (targetMember.role === "owner") {
    return res.status(400).json({ error: "Cannot change the role of the group owner" });
  }

  targetMember.role = role;
  await targetMember.save();
  res.json({ ok: true, member: targetMember });
}));

communitiesRouter.delete("/:id/members/:userId", asyncHandler(async (req: AuthedRequest, res) => {
  const callerMember = await CommunityMember.findOne({ communityId: req.params.id, userId: req.userId });
  if (!callerMember || !["owner", "admin", "moderator"].includes(callerMember.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const targetMember = await CommunityMember.findOne({ communityId: req.params.id, userId: req.params.userId });
  if (!targetMember) return res.status(404).json({ error: "Member not found" });

  if (targetMember.role === "owner") {
    return res.status(400).json({ error: "Cannot kick the owner of the group" });
  }

  if (callerMember.role === "moderator" && ["owner", "admin", "moderator"].includes(targetMember.role)) {
    return res.status(403).json({ error: "Moderators can only kick standard members" });
  }
  if (callerMember.role === "admin" && ["owner", "admin"].includes(targetMember.role)) {
    return res.status(403).json({ error: "Admins cannot kick the owner or other admins" });
  }

  await targetMember.deleteOne();
  await Community.updateOne({ _id: req.params.id }, { $inc: { members: -1 } });

  res.json({ ok: true });
}));

const voteSchema = z.object({ optionIndex: z.number().int() });
communitiesRouter.post("/channels/:channelId/messages/:messageId/poll/vote", validate(voteSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const ch = await Channel.findById(req.params.channelId);
  if (!ch) return res.status(404).json({ error: "Channel not found" });
  
  const member = await CommunityMember.findOne({ communityId: ch.communityId, userId: req.userId });
  if (!member) return res.status(403).json({ error: "Access denied" });

  const msg = await Message.findOne({ _id: req.params.messageId, channelId: ch._id });
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

  const serialized = {
    id: String(msg._id),
    channelId: String(msg.channelId),
    authorId: String(msg.senderId),
    text: msg.text,
    attachments: msg.attachments ?? [],
    createdAt: msg.createdAt?.toISOString?.() ?? new Date().toISOString(),
    system: false,
    replyToMessageId: msg.replyToMessageId ?? null,
    isAnnouncement: msg.isAnnouncement ?? false,
    reactions: msg.reactions ? (msg.reactions instanceof Map ? Object.fromEntries(msg.reactions.entries()) : msg.reactions) : {},
    poll: msg.poll ?? null,
  };

  const io = getIO();
  if (io) {
    io.to(`channel:${ch._id}`).emit("channel:message_updated", {
      channelId: String(ch._id),
      message: serialized,
    });
  }

  res.json({ message: serialized });
}));
