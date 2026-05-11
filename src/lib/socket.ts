/**
 * Socket transport singleton.
 *
 * In DEV_OFFLINE_MODE this is a no-op event bus so the messaging UI can
 * fully exercise typing indicators, presence, and local broadcast without
 * a backend. When the Express + Socket.IO server is online (M5), swap the
 * implementation here for a real socket.io-client without touching consumers.
 *
 * Cross-platform: no direct window/document access. Safe under SSR.
 */
type Listener = (...args: any[]) => void;

class LocalBus {
  private listeners = new Map<string, Set<Listener>>();
  on(event: string, cb: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }
  emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }
  reset() { this.listeners.clear(); }
}

export const socketBus = new LocalBus();

export const SocketEvents = {
  MessageNew: "message:new",
  MessageRead: "message:read",
  TypingStart: "typing:start",
  TypingStop: "typing:stop",
  PresenceOnline: "presence:online",
  PresenceOffline: "presence:offline",
  NotificationNew: "notification:new",
  ChannelMessage: "channel:message",
} as const;
