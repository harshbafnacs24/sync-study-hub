import type { CSSProperties } from "react";
import type { Peer } from "../../lib/types";

export function Avatar({ peer, size = 36 }: { peer: Pick<Peer, "initials" | "online"> & { avatar?: string | null }; size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {peer.avatar ? (
        <img
          src={peer.avatar}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius: 999,
            objectFit: "cover",
            border: "1px solid var(--color-border)",
            display: "block"
          }}
        />
      ) : (
        <div
          className="ss-display"
          style={{
            width: size,
            height: size,
            borderRadius: 999,
            background: "var(--bg-3)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: size * 0.36,
            color: "var(--color-foreground)",
          }}
        >
          {peer.initials}
        </div>
      )}
      {peer.online && <PresenceDot />}
    </div>
  );
}

export function PresenceDot({ style }: { style?: CSSProperties }) {
  return (
    <span
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 999,
        background: "var(--success)",
        border: "2px solid var(--color-background)",
        ...style,
      }}
    />
  );
}

export function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      className="ss-mono"
      style={{
        background: "var(--color-primary)",
        color: "var(--color-primary-foreground)",
        borderRadius: 999,
        padding: "1px 7px",
        fontSize: "0.62rem",
        fontWeight: 700,
        minWidth: 18,
        textAlign: "center",
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
