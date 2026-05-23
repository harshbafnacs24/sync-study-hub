import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import * as svc from "./auth.service.js";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80),
});
const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});
const googleSchema = z.object({ idToken: z.string().min(10).max(4096) });

authRouter.post("/signup", async (req, res, next) => {
  try {
    const body = signupSchema.parse(req.body);
    res.status(201).json(await svc.signupWithEmail(body.email, body.password, body.name));
  } catch (e) { next(e); }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    res.json(await svc.loginWithEmail(body.email, body.password));
  } catch (e) { next(e); }
});

authRouter.post("/google", async (req, res, next) => {
  try {
    const body = googleSchema.parse(req.body);
    res.json(await svc.loginWithGoogle(body.idToken));
  } catch (e) { next(e); }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    res.json(await svc.getMe(req.userId!));
  } catch (e) { next(e); }
});
