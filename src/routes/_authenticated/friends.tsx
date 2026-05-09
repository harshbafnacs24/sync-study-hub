import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../../components/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({ meta: [{ title: "Friends — Sync & Study" }] }),
  component: () => <ComingSoon title="Friends" tagline="Your study network" />,
});
