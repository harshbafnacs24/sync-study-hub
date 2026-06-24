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
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          env.corsOrigins.includes(origin) ||
          env.corsOrigins.includes("*") ||
          origin.endsWith(".vercel.app") ||
          origin.endsWith(".workers.dev")
        ) {
          callback(null, true);
        } else {
          callback(new Error(`Origin not allowed by Socket CORS: ${origin}`));
        }
      },
      credentials: false,
    },
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

    socket.on("conversation:join", (id: string) => {
      const room = id.startsWith("conv:") ? id : `conv:${id}`;
      socket.join(room);
    });
    socket.on("conversation:leave", (id: string) => {
      const room = id.startsWith("conv:") ? id : `conv:${id}`;
      socket.leave(room);
    });
    socket.on("channel:join", (id: string) => {
      const room = id.startsWith("channel:") ? id : `channel:${id}`;
      socket.join(room);
    });
    socket.on("channel:leave", (id: string) => {
      const room = id.startsWith("channel:") ? id : `channel:${id}`;
      socket.leave(room);
    });

    socket.on("typing:start", (data: any) => {
      const room = typeof data === "string" ? data : data?.room;
      if (room) socket.to(room).emit("typing:start", { userId, room });
    });
    socket.on("typing:stop", (data: any) => {
      const room = typeof data === "string" ? data : data?.room;
      if (room) socket.to(room).emit("typing:stop", { userId, room });
    });

    socket.on("study:started", (data: Record<string, unknown>) => {
      socket.broadcast.emit("study:started", { ...data, userId });
    });
    socket.on("study:completed", (data: Record<string, unknown>) => {
      socket.broadcast.emit("study:completed", { ...data, userId });
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      io!.emit("presence:offline", { userId });
    });
  });

  return io;
}
