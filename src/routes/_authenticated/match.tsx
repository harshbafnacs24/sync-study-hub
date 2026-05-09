import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../../components/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/match")({
  head: () => ({ meta: [{ title: "Match — Sync & Study" }] }),
  component: () => <ComingSoon title="Match" tagline="Find your study buddy" />,
});
