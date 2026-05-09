import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { Profile } from "../../models/Profile.js";

export const profileRouter = Router();

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  avatar: z.string().url().max(2048).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  school: z.string().max(120).nullable().optional(),
  year: z.string().max(40).nullable().optional(),
  subjects: z.array(z.string().min(1).max(60)).max(20).optional(),
  goals: z.string().max(1000).nullable().optional(),
  timezone: z.string().max(64).nullable().optional(),
});

function serialize(doc: any) {
  return {
    userId: String(doc.userId),
    name: doc.name,
    avatar: doc.avatar,
    bio: doc.bio,
    school: doc.school,
    year: doc.year,
    subjects: doc.subjects ?? [],
    goals: doc.goals,
    timezone: doc.timezone,
    updatedAt: doc.updatedAt?.toISOString?.(),
  };
}

profileRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.userId });
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json({ profile: serialize(profile) });
  } catch (e) { next(e); }
});

profileRouter.patch("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const patch = patchSchema.parse(req.body);
    const profile = await Profile.findOneAndUpdate(
      { userId: req.userId },
      { $set: patch },
      { new: true },
    );
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json({ profile: serialize(profile) });
  } catch (e) { next(e); }
});
