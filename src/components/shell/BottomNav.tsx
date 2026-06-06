import { Link, useLocation } from "@tanstack/react-router";
import { LayoutGrid, Timer, MessageSquare, Users, Sparkles, User } from "lucide-react";

const items = [
  { to: "/home" as const,        label: "Home",     Icon: LayoutGrid,   match: ["/home"] },
  { to: "/focus" as const,       label: "Focus",    Icon: Timer,        match: ["/focus"] },
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
          <Link
            key={to}
            to={to}
            className={`ss-nav-btn ${active ? "is-active" : ""}`}
            style={{
              paddingBottom: active ? 14 : undefined,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                transition: "transform 250ms cubic-bezier(0.16,1,0.3,1)",
                transform: active ? "scale(1.18)" : "scale(1)",
              }}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.2 : 1.7}
                style={{ transition: "stroke-width 250ms ease" }}
              />
            </span>
            <span
              style={{
                opacity: active ? 1 : 0.55,
                transition: "opacity 250ms cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              {label}
            </span>
            {active && <span className="ss-nav-pip" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}

