/**
 * Socket transport singleton.
 *
 * In DEV_OFFLINE_MODE this is a no-op event bus + a BroadcastChannel bridge
 * so the messaging UI can sync across browser tabs without a backend.
 * When the Express + Socket.IO server is online (M5), swap the implementation
 * here for socket.io-client without touching consumers.
 *
 * Cross-platform: window/BroadcastChannel access is guarded so this file is
 * safe to import under SSR and on platforms (Capacitor/RN) where BC may be
 * unavailable.
 */
type Listener = (...args: any[]) => void;

const BC_NAME = "ss-socket-bus";

class LocalBus {
  private listeners = new Map<string, Set<Listener>>();
  private bc: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      try {
        this.bc = new BroadcastChannel(BC_NAME);
        this.bc.onmessage = (e: MessageEvent) => {
          const { event, args } = (e.data ?? {}) as { event: string; args: unknown[] };
          if (event) this.dispatch(event, args ?? []);
        };
      } catch {
        this.bc = null;
      }
    }
  }

  on(event: string, cb: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  emit(event: string, ...args: unknown[]) {
    this.dispatch(event, args);
    try { this.bc?.postMessage({ event, args }); } catch { /* noop */ }
  }

  private dispatch(event: string, args: unknown[]) {
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
  ConversationUpdated: "conversation:updated",
} as const;
