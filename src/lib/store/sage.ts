/**
 * Persisted Sage threads — lets users return to past conversations.
 * Stored in localStorage; swappable for the backend SageConversation model
 * when the Express server is wired in M5.
 */
import { storage, newId } from "./storage";

export interface SageTurn {
  id: string;
  role: "user" | "sage";
  text: string;
  createdAt: string;
}

export interface SageThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: SageTurn[];
}

const KEY = "sage.threads";
const MAX_THREADS = 30;

export const sageStore = {
  list(): SageThread[] {
    return [...storage.get<SageThread[]>(KEY, [])].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  },
  get(id: string): SageThread | undefined {
    return sageStore.list().find((t) => t.id === id);
  },
  create(firstUserText: string): SageThread {
    const now = new Date().toISOString();
    const thread: SageThread = {
      id: newId(),
      title: firstUserText.slice(0, 60).trim() || "New conversation",
      createdAt: now,
      updatedAt: now,
      turns: [],
    };
    const next = [thread, ...storage.get<SageThread[]>(KEY, [])].slice(0, MAX_THREADS);
    storage.set(KEY, next);
    return thread;
  },
  appendTurn(threadId: string, turn: Omit<SageTurn, "id" | "createdAt"> & { id?: string }): SageTurn {
    const all = storage.get<SageThread[]>(KEY, []);
    const idx = all.findIndex((t) => t.id === threadId);
    if (idx < 0) throw new Error(`Sage thread ${threadId} not found`);
    const now = new Date().toISOString();
    const newTurn: SageTurn = {
      id: turn.id ?? newId(),
      role: turn.role,
      text: turn.text,
      createdAt: now,
    };
    all[idx] = { ...all[idx], turns: [...all[idx].turns, newTurn], updatedAt: now };
    storage.set(KEY, all);
    return newTurn;
  },
  updateTurnText(threadId: string, turnId: string, text: string) {
    const all = storage.get<SageThread[]>(KEY, []);
    const idx = all.findIndex((t) => t.id === threadId);
    if (idx < 0) return;
    const turns = all[idx].turns.map((t) => (t.id === turnId ? { ...t, text } : t));
    all[idx] = { ...all[idx], turns, updatedAt: new Date().toISOString() };
    storage.set(KEY, all);
  },
  rename(threadId: string, title: string) {
    const all = storage.get<SageThread[]>(KEY, []);
    const idx = all.findIndex((t) => t.id === threadId);
    if (idx < 0) return;
    all[idx] = { ...all[idx], title: title.slice(0, 80) || all[idx].title };
    storage.set(KEY, all);
  },
  remove(threadId: string) {
    storage.set(
      KEY,
      storage.get<SageThread[]>(KEY, []).filter((t) => t.id !== threadId),
    );
  },
  clear() { storage.set(KEY, []); },
};
