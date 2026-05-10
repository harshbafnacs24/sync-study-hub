/** Tiny localStorage helper with namespacing + JSON safety. */
const NS = "ss.v1.";

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(NS + key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(NS + key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  },
  remove(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(NS + key);
  },
};

export const newId = () =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);
