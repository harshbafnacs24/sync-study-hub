import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "../lib/auth-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="ss-frame">
        <div className="ss-shell" style={{ alignItems: "center", justifyContent: "center" }}>
          <span className="ss-mono" style={{ color: "var(--color-muted-foreground)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>
            loading…
          </span>
        </div>
      </div>
    );
  }
  return <Navigate to={user ? "/home" : "/login"} />;
}
