import { Link, useLocation } from "@tanstack/react-router";
import { LayoutGrid, Timer, Users, UserCheck, Sparkles, User } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

const items = [
  { to: "/home" as const,        label: "Home",     Icon: LayoutGrid,    match: ["/home"], color: "#ff4d6d" },      // Vibrant Instagram Pink-Red
  { to: "/focus" as const,       label: "Focus",    Icon: Timer,         match: ["/focus"], color: "#ffb703" },     // Focus Amber Gold
  { to: "/communities" as const, label: "Community", Icon: Users,        match: ["/communities"], color: "#7209b7" }, // Deep Violet Purple
  { to: "/discover" as const,    label: "Friends",  Icon: UserCheck,     match: ["/discover", "/network"], color: "#06d6a0" }, // Emerald Mint
  { to: "/sage" as const,        label: "Sage",     Icon: Sparkles,      match: ["/sage"], color: "#4361ee" },      // Royal Blue
  { to: "/profile" as const,     label: "Profile",  Icon: User,          match: ["/profile"], color: "#f72585" },   // Magenta
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  
  return (
    <nav className="ss-nav" aria-label="Primary">
      {items.map(({ to, label, Icon, match, color }) => {
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
              {label === "Profile" && user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: active ? `2px solid ${color}` : "1.5px solid var(--color-border)",
                    objectFit: "cover",
                    transition: "border-color 250ms ease",
                  }}
                />
              ) : (
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.7}
                  style={{ 
                    transition: "stroke-width 250ms ease, color 250ms ease",
                    color: active ? color : "var(--color-muted-foreground)"
                  }}
                />
              )}
            </span>
            <span
              style={{
                opacity: active ? 1 : 0.55,
                color: active ? color : "var(--color-muted-foreground)",
                transition: "opacity 250ms cubic-bezier(0.16,1,0.3,1), color 250ms ease",
                fontWeight: active ? 700 : 500
              }}
            >
              {label}
            </span>
            {active && (
              <span 
                className="ss-nav-pip" 
                aria-hidden="true" 
                style={{
                  background: color,
                  boxShadow: `0 0 8px ${color}aa`
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

