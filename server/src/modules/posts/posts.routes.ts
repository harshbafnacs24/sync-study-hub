import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler, validate } from "../../middleware/validate.js";
import { Post } from "../../models/Post.js";
import { Comment } from "../../models/Comment.js";
import { Like } from "../../models/Like.js";
import { Connection } from "../../models/Connection.js";
import { Profile } from "../../models/Profile.js";
import { createNotification } from "../../lib/notifications.js";

export const postsRouter = Router();
postsRouter.use(requireAuth);

async function getFriendIds(userId: string): Promise<string[]> {
  const conns = await Connection.find({
    $or: [{ fromUserId: userId }, { toUserId: userId }],
    status: "accepted",
  });
  return conns.map((c) => (String(c.fromUserId) === userId ? String(c.toUserId) : String(c.fromUserId)));
}

async function serializePost(post: any, viewerId: string) {
  const author = await Profile.findOne({ userId: post.authorId });
  const likeCount = await Like.countDocuments({ postId: post._id });
  const liked = !!(await Like.findOne({ postId: post._id, userId: viewerId }));
  const commentCount = await Comment.countDocuments({ postId: post._id });
  const saves = post.saves ?? [];
  const shares = post.shares ?? [];
  const views = post.views ?? [];
  return {
    id: String(post._id),
    authorId: post.authorId,
    content: post.content,
    mediaUrl: post.mediaUrl ?? null,
    mediaType: post.mediaType ?? null,
    type: post.type ?? "post",
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString?.() ?? null,
    author: {
      id: post.authorId,
      name: author?.name ?? "Unknown",
      avatar: author?.avatar ?? null,
      school: author?.school ?? "",
    },
    likeCount,
    liked,
    commentCount,
    savesCount: saves.length,
    sharesCount: shares.length,
    viewsCount: views.length,
    saved: saves.includes(viewerId),
    shared: shares.includes(viewerId),
  };
}

postsRouter.get("/feed", asyncHandler(async (req: AuthedRequest, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 15)));
  const skip = (page - 1) * limit;

  const friendIds = await getFriendIds(req.userId!);
  const authorIds = [...friendIds, req.userId!];

  // Fetch friends' posts
  const friendsPosts = await Post.find({ authorId: { $in: authorIds }, type: "post" })
    .sort({ createdAt: -1 })
    .limit(100);

  // Fetch recommendations (public posts from non-friends)
  const recommendationPosts = await Post.find({ authorId: { $nin: authorIds }, type: "post" })
    .sort({ createdAt: -1 })
    .limit(100);

  // Combine and paginate
  const allPosts = [...friendsPosts, ...recommendationPosts];
  const paginated = allPosts.slice(skip, skip + limit);

  const serialized = await Promise.all(paginated.map((p) => serializePost(p, req.userId!)));
  res.json({ posts: serialized });
}));

const createSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaUrl: z.string().optional().nullable(),
  mediaType: z.enum(["image", "video", "gif"]).optional().nullable(),
  type: z.enum(["post", "story", "reel"]).optional().default("post"),
});
postsRouter.post("/", validate(createSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { content, mediaUrl, mediaType, type } = req.body as { content: string; mediaUrl?: string | null; mediaType?: "image" | "video" | "gif" | null; type?: "post" | "story" | "reel" };
  const post = await Post.create({ authorId: req.userId, content, mediaUrl: mediaUrl ?? null, mediaType: mediaType ?? null, type: type ?? "post" });
  res.status(201).json({ post: await serializePost(post, req.userId!) });
}));

const updateSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaUrl: z.string().optional().nullable(),
  mediaType: z.enum(["image", "video", "gif"]).optional().nullable(),
});
postsRouter.patch("/:id", validate(updateSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const post = await Post.findOne({ _id: req.params.id, authorId: req.userId });
  if (!post) return res.status(404).json({ error: "Post not found" });
  const body = req.body as { content: string; mediaUrl?: string | null; mediaType?: "image" | "video" | "gif" | null };
  post.content = body.content;
  if (body.mediaUrl !== undefined) post.mediaUrl = body.mediaUrl;
  if (body.mediaType !== undefined) post.mediaType = body.mediaType;
  post.editedAt = new Date();
  await post.save();
  res.json({ post: await serializePost(post, req.userId!) });
}));

postsRouter.get("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json({ post: await serializePost(post, req.userId!) });
}));

postsRouter.delete("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const post = await Post.findOne({ _id: req.params.id, authorId: req.userId });
  if (!post) return res.status(404).json({ error: "Post not found" });
  await Comment.deleteMany({ postId: post._id });
  await Like.deleteMany({ postId: post._id });
  await post.deleteOne();
  res.json({ ok: true });
}));

postsRouter.post("/:id/like", asyncHandler(async (req: AuthedRequest, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const existing = await Like.findOne({ postId: post._id, userId: req.userId });
  if (existing) {
    await existing.deleteOne();
  } else {
    await Like.create({ postId: post._id, userId: req.userId });
    if (post.authorId !== req.userId) {
      const liker = await Profile.findOne({ userId: req.userId });
      await createNotification({
        userId: post.authorId,
        kind: "like",
        title: "New Like",
        body: `${liker?.name ?? "Someone"} liked your post`,
        href: "/discover",
        payload: { postId: String(post._id) },
      });
    }
  }

  res.json({ post: await serializePost(post, req.userId!) });
}));

postsRouter.get("/:id/comments", asyncHandler(async (req: AuthedRequest, res) => {
  const comments = await Comment.find({ postId: req.params.id }).sort({ createdAt: 1 }).limit(100);
  const profiles = await Profile.find({ userId: { $in: comments.map((c) => new mongoose.Types.ObjectId(c.authorId)) } });
  const profileMap = new Map(profiles.map((p) => [String(p.userId), p]));

  res.json({
    comments: comments.map((c) => ({
      id: String(c._id),
      postId: String(c.postId),
      authorId: c.authorId,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: {
        id: c.authorId,
        name: profileMap.get(c.authorId)?.name ?? "Unknown",
        avatar: profileMap.get(c.authorId)?.avatar ?? null,
      },
    })),
  });
}));

const commentSchema = z.object({ content: z.string().min(1).max(1000) });
postsRouter.post("/:id/comments", validate(commentSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const comment = await Comment.create({
    postId: post._id,
    authorId: req.userId,
    content: (req.body as { content: string }).content,
  });

  if (post.authorId !== req.userId) {
    const commenter = await Profile.findOne({ userId: req.userId });
    await createNotification({
      userId: post.authorId,
      kind: "comment",
      title: "New Comment",
      body: `${commenter?.name ?? "Someone"} commented on your post`,
      href: "/discover",
      payload: { postId: String(post._id), commentId: String(comment._id) },
    });
  }

  const author = await Profile.findOne({ userId: req.userId });
  res.status(201).json({
    comment: {
      id: String(comment._id),
      postId: String(comment.postId),
      authorId: comment.authorId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: { id: comment.authorId, name: author?.name ?? "Unknown", avatar: author?.avatar ?? null },
    },
  });
}));

postsRouter.get("/stories", asyncHandler(async (req: AuthedRequest, res) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stories = await Post.find({ type: "story", createdAt: { $gte: oneDayAgo } })
    .sort({ createdAt: -1 })
    .limit(50);
  const serialized = await Promise.all(stories.map((p) => serializePost(p, req.userId!)));
  res.json({ stories: serialized });
}));

postsRouter.get("/reels", asyncHandler(async (req: AuthedRequest, res) => {
  const reels = await Post.find({ type: "reel" })
    .sort({ createdAt: -1 })
    .limit(50);
  const serialized = await Promise.all(reels.map((p) => serializePost(p, req.userId!)));
  res.json({ reels: serialized });
}));

postsRouter.post("/:id/share", asyncHandler(async (req: AuthedRequest, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  
  await Post.updateOne({ _id: post._id }, { $addToSet: { shares: req.userId } });
  const updated = await Post.findById(post._id);
  res.json({ post: await serializePost(updated, req.userId!) });
}));

postsRouter.post("/:id/save", asyncHandler(async (req: AuthedRequest, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  
  const saves = post.saves ?? [];
  if (saves.includes(req.userId!)) {
    await Post.updateOne({ _id: post._id }, { $pull: { saves: req.userId } });
  } else {
    await Post.updateOne({ _id: post._id }, { $addToSet: { saves: req.userId } });
  }
  const updated = await Post.findById(post._id);
  res.json({ post: await serializePost(updated, req.userId!) });
}));

postsRouter.get("/saved", asyncHandler(async (req: AuthedRequest, res) => {
  const posts = await Post.find({ saves: req.userId }).sort({ createdAt: -1 });
  const serialized = await Promise.all(posts.map((p) => serializePost(p, req.userId!)));
  res.json({ posts: serialized });
}));
