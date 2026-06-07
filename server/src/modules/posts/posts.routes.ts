import { Router } from "express";
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
  return {
    id: String(post._id),
    authorId: post.authorId,
    content: post.content,
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
  };
}

postsRouter.get("/feed", asyncHandler(async (req: AuthedRequest, res) => {
  const friendIds = await getFriendIds(req.userId!);
  const authorIds = [...friendIds, req.userId!];
  const posts = await Post.find({ authorId: { $in: authorIds } })
    .sort({ createdAt: -1 })
    .limit(50);
  const serialized = await Promise.all(posts.map((p) => serializePost(p, req.userId!)));
  res.json({ posts: serialized });
}));

const createSchema = z.object({ content: z.string().min(1).max(2000) });
postsRouter.post("/", validate(createSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const { content } = req.body as { content: string };
  const post = await Post.create({ authorId: req.userId, content });
  res.status(201).json({ post: await serializePost(post, req.userId!) });
}));

const updateSchema = z.object({ content: z.string().min(1).max(2000) });
postsRouter.patch("/:id", validate(updateSchema), asyncHandler(async (req: AuthedRequest, res) => {
  const post = await Post.findOne({ _id: req.params.id, authorId: req.userId });
  if (!post) return res.status(404).json({ error: "Post not found" });
  post.content = (req.body as { content: string }).content;
  post.editedAt = new Date();
  await post.save();
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
  const profiles = await Profile.find({ userId: { $in: comments.map((c) => c.authorId) } });
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
