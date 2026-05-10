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

  // Legacy unversioned aliases (so the existing frontend keeps working).
  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);

  // Error handler — keep last.
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err?.message ?? "Internal server error" });
  });

  app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
    console.log(`[server] CORS origins: ${env.corsOrigins.join(", ")}`);
  });
}

main().catch((e) => {
  console.error("[server] fatal:", e);
  process.exit(1);
});
