import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  let token = "";
  const header = req.headers.authorization ?? "";
  const [scheme, schemeToken] = header.split(" ");
  if (scheme === "Bearer" && schemeToken) {
    token = schemeToken;
  } else if (req.query.token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string };
    if (!payload.sub) throw new Error("bad token");
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  let token = "";
  const header = req.headers.authorization ?? "";
  const [scheme, schemeToken] = header.split(" ");
  if (scheme === "Bearer" && schemeToken) {
    token = schemeToken;
  } else if (req.query.token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret) as { sub?: string };
      if (payload.sub) {
        req.userId = payload.sub;
      }
    } catch {
      // Ignore token verification errors for optional auth
    }
  }
  next();
}

