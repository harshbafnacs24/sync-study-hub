import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Server } from "socket.io";

type AnySocket = any;

export interface SocketContext {
  userId: string;
}

let io: Server | null = null;
const onlineUsers = new Set<string>();

export function getIO(): Server | null {
  return io;
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers);
}

export function emitToUser(userId: string, event: string, data: any) {
  io?.to(`user:${userId}`).emit(event, data);
}

export function attachSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
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
    onlineUsers.add(userId);
    io!.emit("presence:online", { userId });

    socket.on("conversation:join", (id: string) => socket.join(`conv:${id}`));
    socket.on("conversation:leave", (id: string) => socket.leave(`conv:${id}`));
    socket.on("channel:join", (id: string) => socket.join(`channel:${id}`));
    socket.on("channel:leave", (id: string) => socket.leave(`channel:${id}`));

    socket.on("typing:start", (room: string) => socket.to(room).emit("typing:start", { userId, room }));
    socket.on("typing:stop", (room: string) => socket.to(room).emit("typing:stop", { userId, room }));

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      io!.emit("presence:offline", { userId });
    });
  });

  return io;
}
