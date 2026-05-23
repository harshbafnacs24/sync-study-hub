import { useEffect, useRef, useState } from "react";

declare global { interface Window { google?: any; Capacitor?: any; } }

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function isNative() {
  return typeof window !== "undefined" &&
    window.Capacitor?.isNativePlatform?.() === true;
}

/**
 * Unified Google Sign-In button.
 * - On Android (Capacitor): renders a styled native-feel button,
 *   calls @codetrix-studio/capacitor-google-auth
 * - On Web: renders the official Google Identity Services button
 */
export function GoogleButton({ onSignIn }: { onSignIn: () => Promise<void> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const native = isNative();

  // Web-only: initialise GSI button
  useEffect(() => {
    if (native || !GOOGLE_CLIENT_ID) return;
    const id = "google-gsi-script";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true; s.defer = true; s.id = id;
      document.head.appendChild(s);
    }
    const tryInit = () => {
      if (!window.google?.accounts?.id || !ref.current) return false;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async () => {
          setLoading(true);
          try { await onSignIn(); } finally { setLoading(false); }
        },
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: "filled_black", size: "large",
        shape: "rectangular", text: "continue_with", width: 320,
      });
      return true;
    };
    if (!tryInit()) {
      const iv = setInterval(() => { if (tryInit()) clearInterval(iv); }, 200);
      return () => clearInterval(iv);
    }
  }, [native, onSignIn]);

  if (!GOOGLE_CLIENT_ID && !native) {
    return (
      <p className="ss-mono" style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", textAlign: "center", letterSpacing: "0.06em" }}>
        // set VITE_GOOGLE_CLIENT_ID to enable Google sign-in
      </p>
    );
  }

  // Android native button
  if (native) {
    return (
      <button
        onClick={async () => { setLoading(true); try { await onSignIn(); } finally { setLoading(false); } }}
        disabled={loading}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, padding: "12px 16px", borderRadius: 8, cursor: "pointer",
          background: "#fff", border: "1px solid rgba(0,0,0,0.12)",
          fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: "#3c4043",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {/* Google "G" logo */}
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
        </svg>
        {loading ? "Signing in…" : "Continue with Google"}
      </button>
    );
  }

  // Web GSI button container
  return <div ref={ref} style={{ display: "flex", justifyContent: "center" }} />;
}
