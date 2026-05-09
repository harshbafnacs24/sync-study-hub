import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../../components/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({ meta: [{ title: "Schedule — Sync & Study" }] }),
  component: () => <ComingSoon title="Schedule" tagline="Plan & track your sessions" />,
});
