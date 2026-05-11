import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/validate.js";
import { Notification } from "../../models/Notification.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const items = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100);
  res.json({ notifications: items });
}));

notificationsRouter.get("/unread-count", asyncHandler(async (req: AuthedRequest, res) => {
  const count = await Notification.countDocuments({ userId: req.userId, read: false });
  res.json({ count });
}));

notificationsRouter.post("/read-all", asyncHandler(async (req: AuthedRequest, res) => {
  await Notification.updateMany({ userId: req.userId, read: false }, { $set: { read: true } });
  res.json({ ok: true });
}));

notificationsRouter.post("/:id/read", asyncHandler(async (req: AuthedRequest, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.userId }, { $set: { read: true } });
  res.json({ ok: true });
}));
