import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/**
 * Renders a Google Identity Services "Sign in with Google" button.
 * Returns the credential (Google ID token) to the parent via onCredential.
 *
 * Renders nothing if VITE_GOOGLE_CLIENT_ID isn't configured.
 */
export function GoogleButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
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
        callback: (resp: { credential: string }) => onCredential(resp.credential),
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 320,
      });
      return true;
    };
    if (!tryInit()) {
      const iv = setInterval(() => { if (tryInit()) clearInterval(iv); }, 200);
      return () => clearInterval(iv);
    }
  }, [onCredential]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="ss-mono" style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", textAlign: "center", letterSpacing: "0.06em" }}>
        // set VITE_GOOGLE_CLIENT_ID to enable Google sign-in
      </p>
    );
  }
  return <div ref={ref} style={{ display: "flex", justifyContent: "center" }} />;
}
