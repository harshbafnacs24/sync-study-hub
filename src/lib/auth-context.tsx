import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, tokenStore } from "./api-client";
import type { AuthUser } from "./types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  signupEmail: (email: string, password: string, name: string) => Promise<void>;
  loginGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: if we have a token, try to fetch /auth/me.
  useEffect(() => {
    let alive = true;
    const t = tokenStore.get();
    if (!t) { setLoading(false); return; }
    api.me()
      .then((r) => { if (alive) setUser(r.user); })
      .catch(() => { tokenStore.clear(); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleAuth = useCallback(async (p: Promise<{ token: string; user: AuthUser }>) => {
    const { token, user: u } = await p;
    tokenStore.set(token);
    setUser(u);
  }, []);

  const value: AuthState = {
    user,
    loading,
    loginEmail: (email, password) => handleAuth(api.login({ email, password })),
    signupEmail: (email, password, name) => handleAuth(api.signup({ email, password, name })),
    loginGoogle: (idToken) => handleAuth(api.google(idToken)),
    logout: () => { tokenStore.clear(); setUser(null); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
