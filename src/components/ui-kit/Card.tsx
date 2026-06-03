import type { ReactNode, CSSProperties } from "react";

export function Card({
  children,
  className,
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      className={`ss-card ss-card-anim ${onClick ? "ss-card-interactive" : ""} ${className ?? ""}`}
      style={{ cursor: onClick ? "pointer" : undefined, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", margin: "22px 0 10px" }}>
      <div>
        {eyebrow && (
          <div className="ss-mono" style={{ fontSize: "0.65rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase" }}>
            {eyebrow}
          </div>
        )}
        <h2 className="ss-display" style={{ fontSize: "1rem", fontWeight: 700, marginTop: 2 }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatTile({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <div className="ss-card ss-card-anim" style={{ padding: 14 }}>
      <div className="ss-display" style={{ fontSize: "1.5rem", fontWeight: 800, color: accent ? "var(--color-primary)" : "var(--color-foreground)", lineHeight: 1 }}>
        {value}
      </div>
      <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--color-muted-foreground)", textTransform: "uppercase", marginTop: 8 }}>
        {label}
      </div>
      {hint && <div style={{ fontSize: "0.7rem", color: "var(--color-muted-foreground)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="ss-card ss-card-anim" style={{ textAlign: "center", padding: "28px 20px" }}>
      <div className="ss-display" style={{ fontSize: "1rem", fontWeight: 700 }}>{title}</div>
      <p style={{ marginTop: 6, color: "var(--color-muted-foreground)", fontSize: "0.85rem" }}>{description}</p>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  const map = {
    low:    { label: "Low",  color: "var(--color-muted-foreground)", bg: "var(--bg-3)" },
    medium: { label: "Med",  color: "var(--info)",        bg: "oklch(0.68 0.16 250 / 0.12)" },
    high:   { label: "High", color: "var(--destructive)", bg: "oklch(0.66 0.24 25 / 0.14)" },
  } as const;
  const m = map[priority];
  return (
    <span
      className="ss-mono"
      style={{
        fontSize: "0.6rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: m.color,
        background: m.bg,
        padding: "3px 8px",
        borderRadius: 999,
        border: `1px solid ${m.color === "var(--color-muted-foreground)" ? "var(--color-border)" : m.color}33`,
        transition: "opacity 150ms ease",
      }}
    >
      {m.label}
    </span>
  );
}

export function PageHeader({ eyebrow, title, sub, right }: { eyebrow: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="ss-ph">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="ss-logo">S&amp;S</div>
        {right}
      </div>
      <div className="ss-ph-row">
        <div>
          <div className="ss-ph-label">{eyebrow}</div>
          <h1 className="ss-ph-title">{title}</h1>
          {sub && <div className="ss-ph-sub">{sub}</div>}
        </div>
      </div>
    </div>
  );
}


