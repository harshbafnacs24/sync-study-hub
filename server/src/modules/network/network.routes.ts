import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { Connection } from "../../models/Connection.js";
import { Profile } from "../../models/Profile.js";
import { Block } from "../../models/Block.js";
import { Report } from "../../models/Report.js";
import { Notification } from "../../models/Notification.js";
import { emitToUser } from "../../realtime/socket.js";

export const networkRouter = Router();
networkRouter.use(requireAuth);

/* ── helper: get IDs this user has blocked OR been blocked by ── */
async function getBlockedIds(userId: string): Promise<string[]> {
  const blocks = await Block.find({
    $or: [{ blockerId: userId }, { blockedId: userId }]
  });
  const ids = new Set<string>();
  for (const b of blocks) {
    ids.add(String(b.blockerId));
    ids.add(String(b.blockedId));
  }
  ids.delete(userId);
  return Array.from(ids);
}

/* ── helper: serialize connection doc ── */
function serializeConn(c: any) {
  return {
    id: String(c._id),
    fromUserId: String(c.fromUserId),
    toUserId: String(c.toUserId),
    status: c.status,
    createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
  };
}

/* ── GET /search?q=... — server-side search ── */
networkRouter.get("/search", asyncHandler(async (req: AuthedRequest, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  if (!q) return res.json({ users: [] });

  const blockedIds = await getBlockedIds(req.userId!);
  const excludeIds = [...blockedIds, req.userId!];

  const profiles = await Profile.find({
    userId: { $nin: excludeIds },
    $or: [
      { name: { $regex: q, $options: "i" } },
      { subjects: { $regex: q, $options: "i" } },
      { bio: { $regex: q, $options: "i" } },
      { school: { $regex: q, $options: "i" } },
      { goals: { $regex: q, $options: "i" } },
    ]
  }).limit(30);

  res.json({ users: profiles.map(mapProfile) });
}));

/* ── GET /discover — paginated user discovery ── */
networkRouter.get("/discover", asyncHandler(async (req: AuthedRequest, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 50);
  const skip = Number(req.query.skip ?? 0);

  const blockedIds = await getBlockedIds(req.userId!);
  const excludeIds = [...blockedIds, req.userId!];

  const profiles = await Profile.find({ userId: { $nin: excludeIds } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1); // +1 to check if there's more

  const hasMore = profiles.length > limit;
  const results = hasMore ? profiles.slice(0, limit) : profiles;

  res.json({
    users: results.map(mapProfile),
    hasMore,
    nextSkip: hasMore ? skip + limit : null,
  });
}));

/* ── GET /for-you — interest-based recommendations ── */
networkRouter.get("/for-you", asyncHandler(async (req: AuthedRequest, res) => {
  const myProfile = await Profile.findOne({ userId: req.userId });
  const mySubjects = myProfile?.subjects ?? [];

  const blockedIds = await getBlockedIds(req.userId!);
  // Also exclude already-connected users
  const connectedConns = await Connection.find({
    $or: [{ fromUserId: req.userId }, { toUserId: req.userId }],
    status: "accepted"
  });
  const connectedIds = connectedConns.map(c => {
    return String(c.fromUserId) === req.userId ? String(c.toUserId) : String(c.fromUserId);
  });

  const excludeIds = [...new Set([...blockedIds, ...connectedIds, req.userId!])];

  const profiles = await Profile.find({ userId: { $nin: excludeIds } }).limit(100);

  // Score by interest overlap
  const scored = profiles.map(p => {
    let score = 0;
    const theirSubjects = p.subjects ?? [];
    for (const s of mySubjects) {
      if (theirSubjects.some((ts: string) => ts.toLowerCase() === s.toLowerCase())) score += 3;
    }
    // Boost if same school
    if (myProfile?.school && p.school && myProfile.school.toLowerCase() === p.school.toLowerCase()) score += 5;
    // Boost if similar goals
    if (myProfile?.goals && p.goals) {
      const myGoalWords = myProfile.goals.toLowerCase().split(/\s+/);
      const theirGoalWords = p.goals.toLowerCase().split(/\s+/);
      for (const w of myGoalWords) {
        if (w.length > 3 && theirGoalWords.includes(w)) score += 1;
      }
    }
    return { profile: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 20);

  res.json({ users: top.map(s => mapProfile(s.profile)) });
}));

/* ── GET /user/:id — get a single user's public profile ── */
networkRouter.get("/user/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const profile = await Profile.findOne({ userId: req.params.id });
  if (!profile) return res.status(404).json({ error: "User not found" });
  res.json({ user: mapProfile(profile) });
}));

/* ── GET /connections — list all connections ── */
networkRouter.get("/connections", asyncHandler(async (req: AuthedRequest, res) => {
  const list = await Connection.find({
    $or: [{ fromUserId: req.userId }, { toUserId: req.userId }]
  });
  res.json({ connections: list.map(serializeConn) });
}));

/* ── POST /connections — send a friend request ── */
const sendSchema = z.object({ toUserId: z.string().min(1) });
networkRouter.post("/connections", validate(sendSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { toUserId } = req.body as { toUserId: string };
  if (req.userId === toUserId) {
    return res.status(400).json({ error: "Cannot connect with yourself" });
  }

  // Check if blocked
  const blocked = await Block.findOne({
    $or: [
      { blockerId: req.userId, blockedId: toUserId },
      { blockerId: toUserId, blockedId: req.userId }
    ]
  });
  if (blocked) return res.status(403).json({ error: "Cannot connect with this user" });

  // Check existing
  const existing = await Connection.findOne({
    $or: [
      { fromUserId: req.userId, toUserId },
      { fromUserId: toUserId, toUserId: req.userId }
    ]
  });
  if (existing) return res.json({ connection: serializeConn(existing) });

  const conn = await Connection.create({ fromUserId: req.userId, toUserId, status: "pending" });

  // Create notification for recipient
  const senderProfile = await Profile.findOne({ userId: req.userId });
  await Notification.create({
    userId: toUserId,
    kind: "community_invite", // reuse existing kind for connection requests
    title: "New Connection Request",
    body: `${senderProfile?.name ?? "Someone"} wants to connect with you`,
    href: "/discover",
    read: false,
  });

  // Emit socket event
  emitToUser(toUserId, "connection:request", {
    connection: serializeConn(conn),
    fromUser: senderProfile ? { name: senderProfile.name, avatar: senderProfile.avatar } : null,
  });

  res.status(201).json({ connection: serializeConn(conn) });
}));

/* ── PUT /connections/:id — accept or reject ── */
const updateSchema = z.object({ status: z.enum(["accepted", "rejected"]) });
networkRouter.put("/connections/:id", validate(updateSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { status } = req.body as { status: "accepted" | "rejected" };
  const conn = await Connection.findOne({
    _id: req.params.id,
    $or: [{ fromUserId: req.userId }, { toUserId: req.userId }]
  });
  if (!conn) return res.status(404).json({ error: "Connection not found" });

  if (status === "accepted" && String(conn.toUserId) !== req.userId) {
    return res.status(403).json({ error: "Only the recipient can accept" });
  }

  conn.status = status;
  await conn.save();

  // Emit socket event to the other user
  const otherUserId = String(conn.fromUserId) === req.userId ? String(conn.toUserId) : String(conn.fromUserId);
  if (status === "accepted") {
    const accepterProfile = await Profile.findOne({ userId: req.userId });
    emitToUser(otherUserId, "connection:accepted", {
      connection: serializeConn(conn),
      acceptedBy: accepterProfile ? { name: accepterProfile.name } : null,
    });

    // Create notification
    await Notification.create({
      userId: otherUserId,
      kind: "community_invite",
      title: "Connection Accepted",
      body: `${accepterProfile?.name ?? "Someone"} accepted your connection request`,
      href: "/discover",
      read: false,
    });
  }

  res.json({ connection: serializeConn(conn) });
}));

/* ── DELETE /connections/:id — remove/cancel ── */
networkRouter.delete("/connections/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const conn = await Connection.findOne({
    _id: req.params.id,
    $or: [{ fromUserId: req.userId }, { toUserId: req.userId }]
  });
  if (!conn) return res.status(404).json({ error: "Connection not found" });

  const otherUserId = String(conn.fromUserId) === req.userId ? String(conn.toUserId) : String(conn.fromUserId);
  await conn.deleteOne();

  emitToUser(otherUserId, "connection:removed", { connectionId: String(conn._id) });
  res.json({ ok: true });
}));

/* ── POST /block — block a user ── */
const blockSchema = z.object({ userId: z.string().min(1) });
networkRouter.post("/block", validate(blockSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { userId: blockedId } = req.body as { userId: string };
  if (req.userId === blockedId) return res.status(400).json({ error: "Cannot block yourself" });

  // Upsert block
  await Block.findOneAndUpdate(
    { blockerId: req.userId, blockedId },
    { blockerId: req.userId, blockedId },
    { upsert: true, new: true }
  );

  // Remove any existing connection
  await Connection.deleteMany({
    $or: [
      { fromUserId: req.userId, toUserId: blockedId },
      { fromUserId: blockedId, toUserId: req.userId }
    ]
  });

  emitToUser(blockedId, "user:blocked", { by: req.userId });
  res.json({ ok: true });
}));

/* ── DELETE /block/:userId — unblock ── */
networkRouter.delete("/block/:userId", asyncHandler(async (req: AuthedRequest, res) => {
  await Block.deleteOne({ blockerId: req.userId, blockedId: req.params.userId });
  res.json({ ok: true });
}));

/* ── GET /blocks — list blocked user IDs ── */
networkRouter.get("/blocks", asyncHandler(async (req: AuthedRequest, res) => {
  const blocks = await Block.find({ blockerId: req.userId });
  res.json({ blockedIds: blocks.map(b => String(b.blockedId)) });
}));

/* ── POST /report — report a user or DM ── */
const reportSchema = z.object({
  userId: z.string().min(1),
  category: z.enum(["spam", "harassment", "inappropriate", "other"]),
  reason: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
});
networkRouter.post("/report", validate(reportSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { userId: reportedUserId, category, reason, conversationId } = req.body as any;
  await Report.create({
    reporterId: req.userId,
    reportedUserId,
    category,
    reason,
    conversationId: conversationId || null,
  });
  res.json({ ok: true });
}));

/* ── Profile mapper ── */
function mapProfile(p: any) {
  return {
    id: String(p.userId),
    userId: String(p.userId),
    username: (p.name ?? "").replace(/\s+/g, ""),
    handle: (p.name ?? "").toLowerCase().replace(/\s+/g, "_"),
    name: p.name ?? "Unknown",
    initials: (p.name ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
    avatar: p.avatar ?? null,
    online: false,
    bio: p.bio ?? "",
    interests: p.subjects ?? [],
    communities: [],
    school: p.school ?? "",
    year: p.year ?? "",
    studyStreak: 0,
    totalHours: 0,
    goals: p.goals ?? "",
  };
}
