import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/google/callback")({
  component: GoogleCallback,
});

/**
 * This page is opened in a popup by auth-context.tsx.
 * It just needs to exist so Google can redirect here.
 * The parent window polls popup.location.href for the token.
 */
function GoogleCallback() {
  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0C0C0C", color: "#666",
      fontFamily: "system-ui", fontSize: 14,
    }}>
      Completing sign-in…
    </div>
  );
}
