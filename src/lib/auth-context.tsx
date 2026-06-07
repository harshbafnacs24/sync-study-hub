import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, tokenStore } from "./api-client";
import { connectSocket, disconnectSocket } from "./socket";
import type { AuthUser } from "./types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  signupEmail: (email: string, password: string, name: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => void;
  loginDemo: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const DEV_BYPASS_AUTH = false;
const MOCK_USER: AuthUser = {
  id: "dev-user",
  email: "dev@syncandstudy.local",
  name: "Dev User",
  createdAt: new Date().toISOString(),
} as AuthUser;

function isNative() {
  return typeof window !== "undefined" &&
    (window as any).Capacitor?.isNativePlatform?.() === true;
}

/** Open a Google OAuth popup and return the ID token */
function getGoogleIdToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";
    if (!clientId) { reject(new Error("Google Client ID is not configured")); return; }

    // Build Google OAuth2 URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/auth/google/callback`,
      response_type: "token id_token",
      scope: "openid email profile",
      nonce: Math.random().toString(36).slice(2),
      prompt: "select_account",
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    const popup = window.open(url, "google-signin", "width=500,height=600,scrollbars=yes");
    if (!popup) { reject(new Error("Popup blocked — please allow popups for this site")); return; }

    let done = false;
    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          if (!done) reject(new Error("Sign-in cancelled"));
          return;
        }
        const href = popup.location.href;
        if (href.includes("id_token=") || href.includes("access_token=")) {
          clearInterval(timer);
          done = true;
          const hash = new URLSearchParams(popup.location.hash.replace("#", ""));
          const idToken = hash.get("id_token");
          popup.close();
          if (idToken) resolve(idToken);
          else reject(new Error("No ID token received"));
        }
      } catch { /* cross-origin, keep waiting */ }
    }, 300);

    // Timeout after 3 minutes
    setTimeout(() => {
      if (!done) {
        clearInterval(timer);
        popup.close();
        reject(new Error("Sign-in timed out"));
      }
    }, 180_000);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEV_BYPASS_AUTH ? MOCK_USER : null);
  const [loading, setLoading] = useState(!DEV_BYPASS_AUTH);

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    let alive = true;
    const t = tokenStore.get();
    if (!t) { setLoading(false); return; }

    if (typeof window !== "undefined" && (window.localStorage.getItem("sas.demo_mode") === "true" || window.sessionStorage.getItem("sas.demo_mode") === "true")) {
      const rawUsers = window.localStorage.getItem("sas.demo_users");
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      const u = users.find((x: any) => x.id === t) || MOCK_USER;
      if (alive) {
        setUser(u);
        setLoading(false);
      }
      return;
    }

    api.me()
      .then((r) => { if (alive) { setUser(r.user); connectSocket(t); } })
      .catch(() => tokenStore.clear())
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleAuth = useCallback(async (p: Promise<{ token: string; user: AuthUser }>) => {
    const { token, user: u } = await p;
    tokenStore.set(token);
    setUser(u);
    connectSocket(token);
  }, []);

  const loginGoogle = async () => {
    // Always use the highly-compatible Web OAuth popup flow.
    // This bypasses any native Android SHA-1 signature or keystore configuration issues!
    const idToken = await getGoogleIdToken();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("sas.demo_mode");
      window.sessionStorage.removeItem("sas.demo_mode");
    }
    await handleAuth(api.google(idToken));
  };

  const loginDemo = async (userId: string = "dev-user") => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sas.demo_mode", "true");
    }
    tokenStore.set(userId);
    let u = MOCK_USER;
    if (typeof window !== "undefined") {
      const rawUsers = window.localStorage.getItem("sas.demo_users");
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      u = users.find((x: any) => x.id === userId) || MOCK_USER;
    }
    setUser(u);
  };

  const value: AuthState = {
    user,
    loading,
    loginEmail: (email, password) => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("sas.demo_mode");
        window.sessionStorage.removeItem("sas.demo_mode");
      }
      return handleAuth(api.login({ email, password }));
    },
    signupEmail: (email, password, name) => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("sas.demo_mode");
        window.sessionStorage.removeItem("sas.demo_mode");
      }
      return handleAuth(api.signup({ email, password, name }));
    },
    loginGoogle,
    loginDemo,
    logout: () => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("sas.demo_mode");
        window.sessionStorage.removeItem("sas.demo_mode");
      }
      tokenStore.clear();
      disconnectSocket();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
