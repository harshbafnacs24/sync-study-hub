import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "../../components/ui-kit/Card";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Sync & Study" }] }),
  component: () => (
    <>
      <PageHeader eyebrow="Inbox" title="Notifications" sub="Reminders, invites, alerts" />
      <div className="ss-body">
        <EmptyState title="All clear" description="You'll see session reminders, task alerts, and room invites here." />
      </div>
    </>
  ),
});
