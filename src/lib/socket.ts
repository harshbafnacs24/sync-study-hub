import { io as ioClient, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./api-client";

type Listener = (...args: any[]) => void;

let socket: Socket | null = null;

class SocketBus {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, cb: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    socket?.on(event, cb);
    return () => {
      this.listeners.get(event)?.delete(cb);
      socket?.off(event, cb);
    };
  }

  emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
    socket?.emit(event, ...args);
  }

  _bindSocket(s: Socket) {
    for (const [event, cbs] of this.listeners) {
      for (const cb of cbs) {
        s.on(event, cb);
      }
    }
  }

  reset() {
    this.listeners.clear();
  }
}

export const socketBus = new SocketBus();

export function connectSocket(token: string) {
  if (typeof window !== "undefined" && window.localStorage.getItem("sas.demo_mode") === "true") {
    console.log("[socket] running in offline demo mode, skipping server connection");
    return;
  }
  if (socket?.connected) socket.disconnect();

  socket = ioClient(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[socket] connected", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] connect error:", err.message);
  });

  // Forward all server events to local bus
  const serverEvents = [
    "message:new",
    "message:read",
    "typing:start",
    "typing:stop",
    "presence:online",
    "presence:offline",
    "notification:new",
    "channel:message",
    "conversation:updated",
    "connection:request",
    "connection:accepted",
    "connection:removed",
    "user:blocked",
  ];
  for (const evt of serverEvents) {
    socket.on(evt, (...args: any[]) => {
      socketBus.emit(evt, ...args);
    });
  }
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  console.log("[socket] disconnected");
}

export const SocketEvents = {
  MessageNew: "message:new",
  MessageRead: "message:read",
  TypingStart: "typing:start",
  TypingStop: "typing:stop",
  PresenceOnline: "presence:online",
  PresenceOffline: "presence:offline",
  NotificationNew: "notification:new",
  ChannelMessage: "channel:message",
  ConversationUpdated: "conversation:updated",
  ConnectionRequest: "connection:request",
  ConnectionAccepted: "connection:accepted",
  ConnectionRemoved: "connection:removed",
  UserBlocked: "user:blocked",
} as const;
