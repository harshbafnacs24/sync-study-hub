import path from "path";
import fs from "fs";
import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { requireAuth, optionalAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/validate.js";
import { SharedFile } from "../../models/SharedFile.js";
import { Conversation } from "../../models/Conversation.js";
import { Connection } from "../../models/Connection.js";
import { Channel } from "../../models/Channel.js";
import { CommunityMember } from "../../models/CommunityMember.js";

const UPLOAD_DIR = path.resolve("uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 20);
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

export const uploadRouter = Router();

uploadRouter.get("/:filename", optionalAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const doc = await SharedFile.findOne({ filename: req.params.filename });
  if (!doc) return res.status(404).json({ error: "File not found" });

  if (doc.conversationId) {
    const conv = await Conversation.findById(doc.conversationId);
    if (!conv?.participants.includes(req.userId!)) {
      return res.status(403).json({ error: "Access denied" });
    }
  }

  const channelId = doc.get("channelId");
  if (channelId) {
    const ch = await Channel.findById(channelId);
    if (ch) {
      const member = await CommunityMember.findOne({ communityId: ch.communityId, userId: req.userId });
      if (!member) {
        return res.status(403).json({ error: "Access denied: you must join the community to access this file" });
      }
    }
  }

  const filePath = path.join(UPLOAD_DIR, doc.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found on disk" });

  res.setHeader("Content-Type", doc.mimeType);
  if (req.query.download === "true") {
    res.setHeader("Content-Disposition", `attachment; filename="${doc.originalName}"`);
  } else {
    res.setHeader("Content-Disposition", `inline; filename="${doc.originalName}"`);
  }
  res.sendFile(filePath);
}));

uploadRouter.use(requireAuth);

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

uploadRouter.post(
  "/post",
  upload.single("file"),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const kind = ALLOWED_MIME[req.file.mimetype] ?? "file";
    if (!["image", "gif", "video"].includes(kind)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Only images, GIFs, and videos are allowed for posts" });
    }

    const doc = await SharedFile.create({
      uploaderId: req.userId,
      conversationId: null,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      kind,
    });

    res.status(201).json({
      file: {
        id: String(doc._id),
        url: `/api/v1/uploads/${doc.filename}`,
        kind,
        name: doc.originalName,
        size: doc.size,
        mimeType: doc.mimeType,
        mediaType: kind === "gif" ? "gif" : kind === "video" ? "video" : "image",
      },
    });
  }),
);

uploadRouter.post(
  "/chat/:conversationId",
  upload.single("file"),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const conv = await Conversation.findOne({ _id: req.params.conversationId, participants: req.userId });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    if (!conv.isGroup) {
      const peerId = conv.participants.find((p) => p !== req.userId);
      if (peerId && !(await areFriends(req.userId!, peerId))) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: "You can only share files with friends" });
      }
    }

    const kind = ALLOWED_MIME[req.file.mimetype] ?? "file";
    const doc = await SharedFile.create({
      uploaderId: req.userId,
      conversationId: conv._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      kind,
    });

    res.status(201).json({
      file: {
        id: String(doc._id),
        url: `/api/v1/uploads/${doc.filename}`,
        kind,
        name: doc.originalName,
        size: doc.size,
        mimeType: doc.mimeType,
      },
    });
  }),
);

uploadRouter.post(
  "/channel/:channelId",
  upload.single("file"),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const ch = await Channel.findById(req.params.channelId);
    if (!ch) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Channel not found" });
    }

    const member = await CommunityMember.findOne({ communityId: ch.communityId, userId: req.userId });
    if (!member) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: "You must join the community to upload files" });
    }

    const kind = ALLOWED_MIME[req.file.mimetype] ?? "file";
    const doc = await SharedFile.create({
      uploaderId: req.userId,
      conversationId: null,
      channelId: ch._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      kind,
    });

    res.status(201).json({
      file: {
        id: String(doc._id),
        url: `/api/v1/uploads/${doc.filename}`,
        kind,
        name: doc.originalName,
        size: doc.size,
        mimeType: doc.mimeType,
      },
    });
  }),
);

