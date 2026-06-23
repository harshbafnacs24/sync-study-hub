import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/communities_/$id/$channel")({
  head: () => ({ meta: [{ title: "Channel — Sync & Study" }] }),
  component: RedirectToGroupDashboard,
});

function RedirectToGroupDashboard() {
  const { id } = useParams({ from: "/_authenticated/communities_/$id/$channel" });
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/communities/$id", params: { id } });
  }, [id, navigate]);

  return (
    <div style={{ padding: 24, textAlign: "center", color: "var(--color-muted-foreground)", fontSize: "0.85rem" }}>
      Redirecting to study group dashboard...
    </div>
  );
}
