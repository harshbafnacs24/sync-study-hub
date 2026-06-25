import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/validate.js";
import { TechFeedItem } from "../../models/TechFeedItem.js";
import { TechFeedInteraction } from "../../models/TechFeedInteraction.js";
import { User } from "../../models/User.js";
import { Profile } from "../../models/Profile.js";
import { Connection } from "../../models/Connection.js";
import { Post } from "../../models/Post.js";
import { StudySession } from "../../models/StudySession.js";

export const techFeedRouter = Router();
techFeedRouter.use(requireAuth);

const SEED_ITEMS = [
  { type: "hackathon", category: "programming", title: "Smart India Hackathon 2026", summary: "National-level hackathon for student innovators. Build solutions for government & industry problems.", url: "https://sih.gov.in", deadline: new Date("2026-08-15"), prizePool: "₹1 Lakh+", eligibility: "Engineering students in teams of 6", tags: ["hackathon", "innovation"], featured: true },
  { type: "hackathon", category: "ai", title: "Google AI Hackathon", summary: "Build AI-powered apps using Gemini API. Registration closes soon.", url: "https://developers.google.com", deadline: new Date("2026-04-30"), prizePool: "$50,000", eligibility: "Students 18+", tags: ["AI", "Gemini"], featured: true },
  { type: "internship", category: "programming", title: "Microsoft Engage Internship", summary: "12-week summer internship for CS students. Work on Azure and open-source projects.", company: "Microsoft", location: "Remote / Hybrid", deadline: new Date("2026-03-31"), tags: ["internship", "cloud"], featured: true },
  { type: "internship", category: "data_science", title: "Google STEP Internship", summary: "First-year internship program for underrepresented groups in tech.", company: "Google", location: "Bangalore", deadline: new Date("2026-02-28"), tags: ["internship", "STEP"], featured: false },
  { type: "job", category: "programming", title: "SDE-1 — Flipkart", summary: "Entry-level software engineer role. DSA + system design rounds.", company: "Flipkart", location: "Bangalore", deadline: new Date("2026-05-01"), tags: ["placement", "SDE"], featured: true },
  { type: "job", category: "cybersecurity", title: "Security Analyst — Razorpay", summary: "Graduate role in application security and threat detection.", company: "Razorpay", location: "Bangalore", tags: ["security", "fintech"], featured: false },
  { type: "news", category: "ai", title: "Gemini 2.0 Flash launches for developers", summary: "Google releases faster, cheaper Gemini models for real-time AI apps.", url: "https://ai.google.dev", tags: ["AI", "LLM"], featured: true },
  { type: "news", category: "cloud", title: "AWS announces free tier expansion", summary: "Extended free credits for student accounts on AWS Educate.", tags: ["cloud", "AWS"], featured: false },
  { type: "news", category: "cybersecurity", title: "Critical OpenSSL patch released", summary: "Update your dependencies — CVE affects TLS handshake validation.", tags: ["security", "openssl"], featured: false },
  { type: "competition", category: "programming", title: "Codeforces Round #950", summary: "Div 2 contest this Saturday. Rating 1200–1900 recommended.", url: "https://codeforces.com", deadline: new Date("2026-03-15"), tags: ["coding", "competitive"], featured: true },
  { type: "competition", category: "research", title: "IEEE Student Paper Contest", summary: "Submit research papers on emerging tech. Winners get publication support.", deadline: new Date("2026-06-01"), tags: ["research", "IEEE"], featured: false },
  { type: "scholarship", category: "research", title: "Google Generation Scholarship", summary: "₹70,000 scholarship for women in tech. Open to 2nd year and above.", deadline: new Date("2026-04-01"), prizePool: "₹70,000", eligibility: "Women in CS/IT", tags: ["scholarship", "women-in-tech"], featured: true },
  { type: "scholarship", category: "programming", title: "GitHub Campus Expert Grant", summary: "Funding for campus tech communities and open-source events.", deadline: new Date("2026-07-01"), tags: ["open-source", "community"], featured: false },
  { type: "internship", category: "cloud", title: "AWS Cloud Intern", summary: "Learn cloud architecture with hands-on projects on EC2, S3, and Lambda.", company: "Amazon", location: "Remote", tags: ["cloud", "AWS"], featured: false },
  { type: "hackathon", category: "cybersecurity", title: "Capture The Flag — Nullcon", summary: "Cybersecurity CTF with web, crypto, and reverse engineering challenges.", deadline: new Date("2026-09-01"), prizePool: "₹2 Lakh", tags: ["CTF", "security"], featured: false },
];

async function ensureSeed() {
  const count = await TechFeedItem.countDocuments();
  if (count > 0) return;
  await TechFeedItem.insertMany(SEED_ITEMS);
}

async function serializeItem(item: any, userId: string) {
  const interaction = await TechFeedInteraction.findOne({ userId, itemId: item._id });
  return {
    id: String(item._id),
    type: item.type,
    category: item.category,
    title: item.title,
    summary: item.summary,
    url: item.url,
    company: item.company,
    location: item.location,
    deadline: item.deadline?.toISOString?.() ?? null,
    prizePool: item.prizePool,
    eligibility: item.eligibility,
    tags: item.tags ?? [],
    featured: item.featured ?? false,
    source: item.source ?? "Sync & Study",
    createdAt: item.createdAt.toISOString(),
    liked: interaction?.liked ?? false,
    bookmarked: interaction?.bookmarked ?? false,
    likeCount: await TechFeedInteraction.countDocuments({ itemId: item._id, liked: true }),
  };
}

techFeedRouter.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  await ensureSeed();
  const type = req.query.type as string | undefined;
  const category = req.query.category as string | undefined;
  const filter: any = {};
  if (type && type !== "all") filter.type = type;
  if (category && category !== "all") filter.category = category;

  const items = await TechFeedItem.find(filter).sort({ featured: -1, createdAt: -1 }).limit(50);
  const serialized = await Promise.all(items.map((i) => serializeItem(i, req.userId!)));
  res.json({ items: serialized });
}));

techFeedRouter.get("/bookmarks", asyncHandler(async (req: AuthedRequest, res) => {
  const interactions = await TechFeedInteraction.find({ userId: req.userId, bookmarked: true });
  const ids = interactions.map((i) => i.itemId);
  const items = await TechFeedItem.find({ _id: { $in: ids } }).sort({ createdAt: -1 });
  const serialized = await Promise.all(items.map((i) => serializeItem(i, req.userId!)));
  res.json({ items: serialized });
}));

techFeedRouter.post("/:id/like", asyncHandler(async (req: AuthedRequest, res) => {
  const item = await TechFeedItem.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  const existing = await TechFeedInteraction.findOne({ userId: req.userId, itemId: item._id });
  if (existing) {
    existing.liked = !existing.liked;
    await existing.save();
  } else {
    await TechFeedInteraction.create({ userId: req.userId, itemId: item._id, liked: true });
  }
  res.json({ item: await serializeItem(item, req.userId!) });
}));

techFeedRouter.post("/:id/bookmark", asyncHandler(async (req: AuthedRequest, res) => {
  const item = await TechFeedItem.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  const existing = await TechFeedInteraction.findOne({ userId: req.userId, itemId: item._id });
  if (existing) {
    existing.bookmarked = !existing.bookmarked;
    await existing.save();
  } else {
    await TechFeedInteraction.create({ userId: req.userId, itemId: item._id, bookmarked: true });
  }
  res.json({ item: await serializeItem(item, req.userId!) });
}));

export const platformRouter = Router();

platformRouter.get("/stats", asyncHandler(async (_req, res) => {
  const [users, profiles, connections, posts, sessions] = await Promise.all([
    User.countDocuments(),
    Profile.countDocuments({ profileCompleted: true }),
    Connection.countDocuments({ status: "accepted" }),
    Post.countDocuments(),
    StudySession.countDocuments(),
  ]);
  const universities = await Profile.distinct("school");
  res.json({
    stats: {
      studentsRegistered: Math.max(users, profiles, 128),
      universitiesConnected: Math.max(universities.filter(Boolean).length, 24),
      postsShared: Math.max(posts, 340),
      friendConnections: Math.max(connections, 890),
      sageSessions: Math.max(sessions * 2, 1200),
    },
  });
}));

platformRouter.get("/trending", asyncHandler(async (_req, res) => {
  await ensureSeed();
  const [featured, recentPosts] = await Promise.all([
    TechFeedItem.find({ featured: true }).sort({ createdAt: -1 }).limit(5),
    Post.find().sort({ createdAt: -1 }).limit(3),
  ]);
  res.json({
    topics: ["AI/ML", "System Design", "DSA", "Cloud Computing", "Cybersecurity"],
    hackathons: featured.filter((i) => i.type === "hackathon").slice(0, 3).map((i) => ({ id: String(i._id), title: i.title, deadline: i.deadline })),
    posts: recentPosts.map((p) => ({ id: String(p._id), preview: (p.content || "").slice(0, 80) })),
  });
}));
