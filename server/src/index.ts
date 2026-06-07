import http from "http";
import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { tasksRouter } from "./modules/tasks/tasks.routes.js";
import { sessionsRouter } from "./modules/sessions/sessions.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { conversationsRouter } from "./modules/messages/messages.routes.js";
import { communitiesRouter } from "./modules/communities/communities.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { sageRouter } from "./modules/sage/sage.routes.js";
import { networkRouter } from "./modules/network/network.routes.js";
import { postsRouter } from "./modules/posts/posts.routes.js";
import { uploadRouter } from "./modules/upload/upload.routes.js";
import { attachSocket } from "./realtime/socket.js";

async function main() {
  await connectDb();

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes("*")) {
          return cb(null, true);
        }
        cb(new Error(`Origin not allowed: ${origin}`));
      },
      credentials: false,
    }),
  );

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // v1 API
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/profile", profileRouter);
  app.use("/api/v1/tasks", tasksRouter);
  app.use("/api/v1/sessions", sessionsRouter);
  app.use("/api/v1/analytics", analyticsRouter);
  app.use("/api/v1/conversations", conversationsRouter);
  app.use("/api/v1/communities", communitiesRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/sage", sageRouter);
  app.use("/api/v1/network", networkRouter);
  app.use("/api/v1/posts", postsRouter);
  app.use("/api/v1/uploads", uploadRouter);

  // Legacy unversioned aliases.
  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/network", networkRouter);

  // Debug seed route for presentation
  app.get("/api/v1/debug/seed-network", async (req, res, next) => {
    try {
      const { User } = await import("./models/User.js");
      const { Profile } = await import("./models/Profile.js");
      const bcrypt = await import("bcryptjs");

      const demoUsers = [
        { email: "aanya@syncstudy.edu", name: "Aanya Mehta", avatar: null, bio: "Computer Science Sophomore | Love talking algorithms & sliding window patterns.", school: "LMN Tech", year: "Sophomore", subjects: ["DSA", "LeetCode", "Java"], goals: "Crack summer internship, finish Striver SDE sheet." },
        { email: "kabir@syncstudy.edu", name: "Kabir Singh", avatar: null, bio: "Full Stack Builder. Pushing React, Node.js, and scaling systems.", school: "LMN Tech", year: "Junior", subjects: ["Web Dev", "React", "NodeJS"], goals: "Scale side project to 100 users, master System Design." },
        { email: "riya@syncstudy.edu", name: "Riya Sharma", avatar: null, bio: "AI/ML Enthusiast. Coding Transformers & NLP notebooks in PyTorch.", school: "ABC College", year: "Senior", subjects: ["AI/ML", "PyTorch", "Python"], goals: "Submit research paper, finish fast.ai course." },
        { email: "arjun@syncstudy.edu", name: "Arjun Verma", avatar: null, bio: "Database nerd & OS designer. Let's study concurrency controls.", school: "XYZ Univ", year: "Freshman", subjects: ["DBMS", "C++", "OS"], goals: "Maintain 9.5 GPA, build a toy database engine." },
        { email: "meera@syncstudy.edu", name: "Meera Iyer", avatar: null, bio: "Systems engineering & network protocol analyzer. Coffee enthusiast.", school: "XYZ Univ", year: "Senior", subjects: ["OS", "Networks", "Go"], goals: "Prepare for final semester exams, learn Rust." }
      ];

      const hash = await bcrypt.default.hash("password123", 10);
      const results = [];

      for (const u of demoUsers) {
        let userDoc = await User.findOne({ email: u.email });
        if (!userDoc) {
          userDoc = await User.create({ email: u.email, passwordHash: hash });
        }
        let profDoc = await Profile.findOne({ userId: userDoc._id });
        if (!profDoc) {
          profDoc = await Profile.create({
            userId: userDoc._id,
            name: u.name,
            avatar: u.avatar,
            bio: u.bio,
            school: u.school,
            year: u.year,
            subjects: u.subjects,
            goals: u.goals
          });
        }
        results.push({ email: u.email, userId: userDoc._id });
      }
      res.json({ ok: true, seeded: results });
    } catch (e) {
      next(e);
    }
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err?.message ?? "Internal server error" });
  });

  const httpServer = http.createServer(app);
  attachSocket(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
    console.log(`[server] CORS origins: ${env.corsOrigins.join(", ")}`);
    console.log(`[server] Sage provider: ${process.env.GEMINI_API_KEY ? "gemini" : "mock"}`);
  });
}

main().catch((e) => {
  console.error("[server] fatal:", e);
  process.exit(1);
});
