import type { Community } from "../../lib/types";
import { Users } from "lucide-react";

export function CommunityCard({
  community,
  onClick,
  action,
}: {
  community: Community;
  onClick?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="ss-card"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined, padding: 14 }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          className="ss-display"
          style={{
            width: 44, height: 44, borderRadius: 10,
            background: "var(--bg-3)", border: "1px solid var(--color-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--color-primary)", fontWeight: 800, fontSize: "1.1rem", flexShrink: 0,
          }}
        >
          {community.iconChar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div className="ss-display" style={{ fontWeight: 700, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {community.name}
            </div>
            {action}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", marginTop: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {community.description}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="ss-mono" style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Users size={11} /> {community.members.toLocaleString()}
            </span>
            {community.tags.slice(0, 2).map((t) => (
              <span key={t} className="ss-chip" style={{ fontSize: "0.62rem", padding: "2px 7px" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
