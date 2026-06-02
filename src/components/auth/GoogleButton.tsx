import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

declare global { interface Window { google?: any; Capacitor?: any; } }

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function isNative() {
  return typeof window !== "undefined" &&
    window.Capacitor?.isNativePlatform?.() === true;
}

export function GoogleButton({ onSignIn }: { onSignIn: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const native = isNative();

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSignIn();
    } catch (e: any) {
      setError(e?.message ?? "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="ss-mono" style={{
        fontSize: "0.65rem", color: "#888",
        textAlign: "center", letterSpacing: "0.06em", padding: "12px 0"
      }}>
        // VITE_GOOGLE_CLIENT_ID not configured
      </p>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "13px 16px",
          borderRadius: 10,
          cursor: loading ? "not-allowed" : "pointer",
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.12)",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: "#3c4043",
          opacity: loading ? 0.7 : 1,
          transition: "opacity 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        }}
      >
        {loading ? (
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: "#4285F4" }} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
          </svg>
        )}
        {loading ? "Signing in…" : "Continue with Google"}
      </button>
      {error && (
        <div style={{
          marginTop: 8, fontSize: "0.78rem", color: "#ff4545",
          textAlign: "center", padding: "6px 10px",
          background: "rgba(255,69,69,0.08)", borderRadius: 7,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
