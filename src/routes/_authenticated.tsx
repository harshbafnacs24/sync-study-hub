import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth-context";
import { MobileShell } from "../components/shell/MobileShell";
import { BottomNav } from "../components/shell/BottomNav";
import { api } from "../lib/api-client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api.getMyProfile(),
    enabled: !!user,
    retry: 1,
  });

  const isSetupPage = pathname === "/profile-setup";
  const profileComplete = profileData?.profile?.profileCompleted ?? false;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || profileLoading || isSetupPage) return;
    if (profileData && !profileComplete) {
      navigate({ to: "/profile-setup" });
    }
  }, [user, profileLoading, profileData, profileComplete, isSetupPage, navigate]);

  if (loading || !user || (profileLoading && !isSetupPage)) {
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
      {!isSetupPage && <BottomNav />}
    </MobileShell>
  );
}
