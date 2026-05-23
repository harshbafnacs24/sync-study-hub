import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { StudyRoom } from "../../models/StudyRoom.js";
import { Profile } from "../../models/Profile.js";

export const roomsRouter = Router();
roomsRouter.use(requireAuth);

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function detectProvider(url: string): string {
  if (/meet\.google/.test(url)) return "meet";
  if (/zoom\.us/.test(url)) return "zoom";
  if (/teams\.microsoft|teams\.live/.test(url)) return "teams";
  return "other";
}

function serialize(room: any) {
  return {
    id: String(room._id),
    name: room.name,
    subject: room.subject ?? null,
    hostId: room.hostId,
    hostName: room.hostName,
    inviteCode: room.inviteCode,
    meetLink: room.meetLink ?? null,
    meetProvider: room.meetProvider ?? null,
    plannedMinutes: room.plannedMinutes,
    participants: (room.participants ?? []).map((p: any) => ({
      userId: p.userId,
      name: p.name,
      joinedAt: p.joinedAt instanceof Date ? p.joinedAt.toISOString() : p.joinedAt,
    })),
    status: room.status,
    createdAt: room.createdAt instanceof Date ? room.createdAt.toISOString() : room.createdAt,
  };
}

/* ─── Routes ────────────────────────────────────────────────────────────── */

const createSchema = z.object({
  name: z.string().min(2).max(80),
  subject: z.string().max(60).nullable().optional(),
  meetLink: z.string().url("Please enter a valid meeting URL").max(2048).nullable().optional(),
  plannedMinutes: z.number().min(5).max(480).default(60),
});

// GET /api/v1/rooms — list active rooms
roomsRouter.get("/", asyncHandler(async (_req: AuthedRequest, res) => {
  const rooms = await StudyRoom.find({ status: "active" }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ rooms: rooms.map(serialize) });
}));

// POST /api/v1/rooms — create a room
roomsRouter.post("/", validate(createSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const body = req.body as z.infer<typeof createSchema>;
  const profile = await Profile.findOne({ userId: req.userId }).lean();
  const hostName = (profile as any)?.name ?? "Anonymous";

  // Generate a unique 6-char invite code
  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (await StudyRoom.exists({ inviteCode }) && attempts < 5) {
    inviteCode = generateInviteCode();
    attempts++;
  }

  const meetProvider = body.meetLink ? detectProvider(body.meetLink) : null;

  const room = await StudyRoom.create({
    name: body.name,
    subject: body.subject ?? null,
    meetLink: body.meetLink ?? null,
    meetProvider,
    plannedMinutes: body.plannedMinutes,
    hostId: req.userId,
    hostName,
    inviteCode,
    participants: [{ userId: req.userId, name: hostName, joinedAt: new Date() }],
    status: "active",
  });

  res.status(201).json({ room: serialize(room) });
}));

// GET /api/v1/rooms/:inviteCode — look up by invite code
roomsRouter.get("/:inviteCode", asyncHandler(async (req: AuthedRequest, res) => {
  const code = req.params.inviteCode.toUpperCase();
  const room = await StudyRoom.findOne({ inviteCode: code, status: "active" }).lean();
  if (!room) return res.status(404).json({ error: "Room not found or has ended" });
  res.json({ room: serialize(room) });
}));

// POST /api/v1/rooms/:inviteCode/join
roomsRouter.post("/:inviteCode/join", asyncHandler(async (req: AuthedRequest, res) => {
  const code = req.params.inviteCode.toUpperCase();
  const room = await StudyRoom.findOne({ inviteCode: code, status: "active" });
  if (!room) return res.status(404).json({ error: "Room not found or has ended" });

  const already = room.participants.some((p: any) => p.userId === req.userId);
  if (!already) {
    const profile = await Profile.findOne({ userId: req.userId }).lean();
    const name = (profile as any)?.name ?? "Anonymous";
    room.participants.push({ userId: req.userId!, name, joinedAt: new Date() } as any);
    await room.save();
  }

  res.json({ room: serialize(room) });
}));

// POST /api/v1/rooms/:id/leave
roomsRouter.post("/:id/leave", asyncHandler(async (req: AuthedRequest, res) => {
  const room = await StudyRoom.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });

  room.participants = room.participants.filter((p: any) => p.userId !== req.userId) as any;

  // End the room if host leaves or room is empty
  if (room.hostId === req.userId || room.participants.length === 0) {
    room.status = "ended" as any;
  }

  await room.save();
  res.json({ room: serialize(room) });
}));

// POST /api/v1/rooms/:id/end — host ends the room
roomsRouter.post("/:id/end", asyncHandler(async (req: AuthedRequest, res) => {
  const room = await StudyRoom.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.hostId !== req.userId) return res.status(403).json({ error: "Only the host can end the room" });
  room.status = "ended" as any;
  await room.save();
  res.json({ room: serialize(room) });
}));
