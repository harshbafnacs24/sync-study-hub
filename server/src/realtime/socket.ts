/**
 * Socket.IO scaffold. Mounted on the same HTTP server as Express.
 * Auth via JWT bearer in the handshake.
 */
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type AnySocket = any;

export interface SocketContext {
  userId: string;
}

export function attachSocket(httpServer: HttpServer) {
  // Lazy-load socket.io so the dep is optional during initial scaffolding.
  let Server: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Server = require("socket.io").Server;
  } catch {
    console.warn("[realtime] socket.io not installed — skipping. `npm i socket.io` in /server to enable.");
    return null;
  }

  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: false },
  });

  io.use((socket: AnySocket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization?.split(" ")[1];
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = jwt.verify(token, env.jwtSecret) as { sub?: string };
      if (!payload.sub) throw new Error("bad token");
      (socket.data as SocketContext).userId = payload.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: AnySocket) => {
    const userId: string = socket.data.userId;
    socket.join(`user:${userId}`);
    io.emit("presence:online", { userId });

    socket.on("conversation:join", (id: string) => socket.join(`conv:${id}`));
    socket.on("conversation:leave", (id: string) => socket.leave(`conv:${id}`));
    socket.on("channel:join", (id: string) => socket.join(`channel:${id}`));
    socket.on("channel:leave", (id: string) => socket.leave(`channel:${id}`));

    socket.on("typing:start", (room: string) => socket.to(room).emit("typing:start", { userId, room }));
    socket.on("typing:stop",  (room: string) => socket.to(room).emit("typing:stop",  { userId, room }));

    socket.on("disconnect", () => {
      io.emit("presence:offline", { userId });
    });
  });

  return io;
}
