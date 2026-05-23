import { Link, useLocation } from "@tanstack/react-router";
import { LayoutGrid, Timer, MessageSquare, Users, Sparkles, User, MonitorPlay } from "lucide-react";

const items = [
  { to: "/home" as const,        label: "Home",     Icon: LayoutGrid,   match: ["/home"] },
  { to: "/focus" as const,       label: "Focus",    Icon: Timer,        match: ["/focus"] },
  { to: "/rooms" as const,       label: "Rooms",    Icon: MonitorPlay,  match: ["/rooms"] },
  { to: "/messages" as const,    label: "Messages", Icon: MessageSquare, match: ["/messages"] },
  { to: "/communities" as const, label: "Spaces",   Icon: Users,        match: ["/communities"] },
  { to: "/sage" as const,        label: "Sage",     Icon: Sparkles,     match: ["/sage"] },
  { to: "/profile" as const,     label: "Profile",  Icon: User,         match: ["/profile"] },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="ss-nav" aria-label="Primary">
      {items.map(({ to, label, Icon, match }) => {
        const active = match.some((m) => pathname === m || pathname.startsWith(m + "/"));
        return (
          <Link key={to} to={to} className={`ss-nav-btn ${active ? "is-active" : ""}`}>
            <Icon size={18} strokeWidth={1.7} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
