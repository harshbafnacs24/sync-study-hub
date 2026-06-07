import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "../lib/auth-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      navigate({ to: user ? "/home" : "/welcome", replace: true });
    }
  }, [loading, user, navigate]);

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

