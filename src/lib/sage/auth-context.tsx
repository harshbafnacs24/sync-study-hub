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
    if (isNative()) {
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
      const result = await GoogleAuth.signIn();
      const idToken = result?.authentication?.idToken;
      if (!idToken) throw new Error("Google sign-in failed");
      await handleAuth(api.google(idToken));
    } else {
      const idToken = await getGoogleIdToken();
      await handleAuth(api.google(idToken));
    }
  };

  const value: AuthState = {
    user,
    loading,
    loginEmail: (email, password) => handleAuth(api.login({ email, password })),
    signupEmail: (email, password, name) => handleAuth(api.signup({ email, password, name })),
    loginGoogle,
    logout: () => {
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
