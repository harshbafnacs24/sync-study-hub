import { Link, useLocation } from "@tanstack/react-router";
import { LayoutGrid, Timer, ListChecks, Users, Sparkles, User } from "lucide-react";

const items = [
  { to: "/home" as const,    label: "Home",   Icon: LayoutGrid },
  { to: "/focus" as const,   label: "Focus",  Icon: Timer },
  { to: "/tasks" as const,   label: "Tasks",  Icon: ListChecks },
  { to: "/rooms" as const,   label: "Rooms",  Icon: Users },
  { to: "/sage" as const,    label: "Sage",   Icon: Sparkles },
  { to: "/profile" as const, label: "Profile",Icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="ss-nav" aria-label="Primary">
      {items.map(({ to, label, Icon }) => {
        const active = pathname === to;
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
