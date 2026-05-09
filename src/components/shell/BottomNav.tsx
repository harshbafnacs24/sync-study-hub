import { Link, useLocation } from "@tanstack/react-router";
import { Home, Users, Video, CalendarDays, UserPlus, User } from "lucide-react";

const items = [
  { to: "/home" as const,     label: "Home",     Icon: Home },
  { to: "/match" as const,    label: "Match",    Icon: Users },
  { to: "/room" as const,     label: "Room",     Icon: Video },
  { to: "/schedule" as const, label: "Schedule", Icon: CalendarDays },
  { to: "/friends" as const,  label: "Friends",  Icon: UserPlus },
  { to: "/profile" as const,  label: "Profile",  Icon: User },
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
