import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";

export const asyncHandler =
  <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: T, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

export const validate =
  <S extends ZodSchema>(schema: S, source: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      (req as any)[source] = schema.parse((req as any)[source]);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return next(Object.assign(new Error("Validation failed"), { status: 400, details: e.flatten() }));
      }
      next(e);
    }
  };
