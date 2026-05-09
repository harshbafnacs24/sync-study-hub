import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { MobileShell } from "../components/shell/MobileShell";
import { BottomNav } from "../components/shell/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <MobileShell>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="ss-mono" style={{ color: "var(--color-muted-foreground)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>
            loading…
          </span>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <Outlet />
      <BottomNav />
    </MobileShell>
  );
}
