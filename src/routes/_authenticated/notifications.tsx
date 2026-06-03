import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, MessageSquare, Hash, AtSign, Users, Clock, ListChecks } from "lucide-react";
import { PageHeader, EmptyState } from "../../components/ui-kit/Card";
import { useNotifications, useMarkNotificationsRead } from "../../lib/hooks/use-messaging";
import { timeAgo } from "../../components/messaging/Avatar";
import type { NotificationKind } from "../../lib/types";
import { PageTransition } from "../../components/shell/PageTransition";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Sync & Study" }] }),
  component: NotificationsPage,
});

const ICONS: Record<NotificationKind, any> = {
  dm: MessageSquare,
  channel_message: Hash,
  mention: AtSign,
  community_invite: Users,
  session_reminder: Clock,
  task_due: ListChecks,
};

function NotificationsPage() {
  const { data: list = [] } = useNotifications();
  const markAll = useMarkNotificationsRead();
  useEffect(() => () => { markAll.mutate(); }, []);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        sub="Reminders, invites, mentions"
        right={
          <button onClick={() => markAll.mutate()} className="ss-btn ss-btn-ghost" style={{ fontSize: "0.7rem", padding: "6px 8px" }}>
            Mark all read
          </button>
        }
      />
      <div className="ss-body" style={{ padding: 12 }}>
        {list.length === 0 ? (
          <EmptyState title="All clear" description="You'll see session reminders, mentions, and invites here." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {list.map((n) => {
              const Icon = ICONS[n.kind] ?? Bell;
              const body = (
                <div style={{ display: "flex", gap: 12, padding: "10px 12px", borderRadius: 8, background: n.read ? "transparent" : "var(--bg-2)", border: n.read ? "1px solid transparent" : "1px solid var(--color-border)", alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", color: n.read ? "var(--color-muted-foreground)" : "var(--color-primary)", flexShrink: 0 }}>
                    <Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span className="ss-display" style={{ fontWeight: 700, fontSize: "0.88rem" }}>{n.title}</span>
                      <span className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)", flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>{n.body}</div>
                  </div>
                  {!n.read && <span style={{ width: 6, height: 6, background: "var(--color-primary)", borderRadius: 999, marginTop: 8, flexShrink: 0 }} />}
                </div>
              );
              return n.href ? (
                <Link key={n.id} to={n.href as any} style={{ textDecoration: "none", color: "inherit" }}>{body}</Link>
              ) : (
                <div key={n.id}>{body}</div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
