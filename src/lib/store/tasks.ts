import { storage, newId } from "./storage";

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null; // YYYY-MM-DD
  subject?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

const KEY = "tasks";

export const tasksStore = {
  list(): Task[] {
    return storage.get<Task[]>(KEY, []);
  },
  create(input: Omit<Task, "id" | "createdAt" | "status" | "completedAt"> & { status?: TaskStatus }): Task {
    const t: Task = {
      id: newId(),
      createdAt: new Date().toISOString(),
      status: input.status ?? "todo",
      completedAt: null,
      ...input,
    };
    storage.set(KEY, [t, ...tasksStore.list()]);
    return t;
  },
  update(id: string, patch: Partial<Task>): Task | null {
    const all = tasksStore.list();
    const idx = all.findIndex((x) => x.id === id);
    if (idx < 0) return null;
    const next = { ...all[idx], ...patch };
    if (patch.status === "done" && !next.completedAt) next.completedAt = new Date().toISOString();
    if (patch.status && patch.status !== "done") next.completedAt = null;
    all[idx] = next;
    storage.set(KEY, all);
    return next;
  },
  remove(id: string) {
    storage.set(KEY, tasksStore.list().filter((x) => x.id !== id));
  },
  toggle(id: string): Task | null {
    const t = tasksStore.list().find((x) => x.id === id);
    if (!t) return null;
    return tasksStore.update(id, { status: t.status === "done" ? "todo" : "done" });
  },
};
