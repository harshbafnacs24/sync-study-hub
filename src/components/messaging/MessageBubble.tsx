import type { ReactNode } from "react";

interface Props {
  mine: boolean;
  text: string;
  meta?: ReactNode;
  system?: boolean;
  authorLabel?: string;
}

export function MessageBubble({ mine, text, meta, system, authorLabel }: Props) {
  if (system) {
    return (
      <div
        className="ss-mono"
        style={{
          textAlign: "center",
          fontSize: "0.65rem",
          letterSpacing: "0.06em",
          color: "var(--color-muted-foreground)",
          textTransform: "uppercase",
          padding: "6px 0",
        }}
      >
        — {text} —
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: mine ? "flex-end" : "flex-start",
        gap: 2,
      }}
    >
      {!mine && authorLabel && (
        <div className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.06em", color: "var(--color-muted-foreground)", textTransform: "uppercase", marginLeft: 4 }}>
          {authorLabel}
        </div>
      )}
      <div
        style={{
          maxWidth: "82%",
          padding: "9px 13px",
          borderRadius: 12,
          background: mine ? "var(--color-primary)" : "var(--bg-3)",
          color: mine ? "var(--color-primary-foreground)" : "var(--color-foreground)",
          fontSize: "0.88rem",
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: mine ? "none" : "1px solid var(--color-border)",
          borderTopRightRadius: mine ? 4 : 12,
          borderTopLeftRadius: mine ? 12 : 4,
        }}
      >
        {text}
      </div>
      {meta && (
        <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", marginTop: 2, padding: "0 4px" }}>
          {meta}
        </div>
      )}
    </div>
  );
}
