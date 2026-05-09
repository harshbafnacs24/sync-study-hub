import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../../components/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/room")({
  head: () => ({ meta: [{ title: "Room — Sync & Study" }] }),
  component: () => <ComingSoon title="Room" tagline="Synchronized study sessions" />,
});
