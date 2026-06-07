import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { Profile } from "../../models/Profile.js";
import { avatarsForGender, randomAvatarForGender } from "../../lib/avatars.js";

export const profileRouter = Router();

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  avatar: z.string().max(2048).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  school: z.string().max(120).nullable().optional(),
  branch: z.string().max(120).nullable().optional(),
  year: z.string().max(40).nullable().optional(),
  subjects: z.array(z.string().min(1).max(60)).max(20).optional(),
  goals: z.string().max(1000).nullable().optional(),
  timezone: z.string().max(64).nullable().optional(),
});

const setupSchema = z.object({
  name: z.string().min(1).max(80),
  school: z.string().min(1).max(120),
  branch: z.string().min(1).max(120),
  year: z.string().min(1).max(40),
  bio: z.string().min(1).max(500),
  subjects: z.array(z.string().min(1).max(60)).min(1).max(20),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  avatar: z.string().max(2048).optional(),
});

function serialize(doc: any) {
  return {
    userId: String(doc.userId),
    name: doc.name,
    publicId: doc.publicId ?? null,
    avatar: doc.avatar,
    bio: doc.bio,
    school: doc.school,
    branch: doc.branch ?? null,
    year: doc.year,
    gender: doc.gender ?? null,
    subjects: doc.subjects ?? [],
    goals: doc.goals,
    timezone: doc.timezone,
    profileCompleted: doc.profileCompleted ?? false,
    updatedAt: doc.updatedAt?.toISOString?.(),
  };
}

profileRouter.get("/me", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const profile = await Profile.findOne({ userId: req.userId });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json({ profile: serialize(profile) });
}));

profileRouter.get("/avatars", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const profile = await Profile.findOne({ userId: req.userId });
  const gender = profile?.gender ?? "other";
  res.json({ avatars: avatarsForGender(gender) });
}));

profileRouter.post("/setup", requireAuth, validate(setupSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const data = req.body as z.infer<typeof setupSchema>;
  const avatar = data.avatar || randomAvatarForGender(data.gender);

  const profile = await Profile.findOneAndUpdate(
    { userId: req.userId },
    {
      $set: {
        name: data.name,
        school: data.school,
        branch: data.branch,
        year: data.year,
        bio: data.bio,
        subjects: data.subjects,
        gender: data.gender,
        avatar,
        profileCompleted: true,
      },
    },
    { new: true, upsert: false },
  );

  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json({ profile: serialize(profile) });
}));

profileRouter.patch("/me", requireAuth, validate(patchSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const patch = req.body;
  const profile = await Profile.findOneAndUpdate(
    { userId: req.userId },
    { $set: patch },
    { new: true },
  );
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json({ profile: serialize(profile) });
}));
