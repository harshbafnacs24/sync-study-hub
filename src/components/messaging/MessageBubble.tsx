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
      {text.trim().startsWith('{"type":"invite"') ? (
        (() => {
          try {
            const data = JSON.parse(text);
            return (
              <div
                style={{
                  maxWidth: "82%",
                  padding: "16px",
                  borderRadius: 14,
                  background: "rgba(20, 20, 20, 0.95)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  lineHeight: 1.45,
                  border: "1px solid rgba(232, 255, 71, 0.25)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  borderTopRightRadius: mine ? 4 : 12,
                  borderTopLeftRadius: mine ? 12 : 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "rgba(232, 255, 71, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--color-primary)",
                  }}>
                    📅
                  </div>
                  <div>
                    <div className="ss-mono" style={{ fontSize: "0.55rem", letterSpacing: "0.08em", color: "#666", textTransform: "uppercase" }}>Study Invite</div>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#f0f0f0" }}>{data.title || "Let's study together!"}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 4 }}>
                  {data.scheduledAt && (
                    <div style={{ fontSize: "0.78rem", color: "#ccc" }}>
                      ⏰ <strong>Time:</strong> {new Date(data.scheduledAt).toLocaleString(undefined, {
                        weekday: "short", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  )}
                  {data.subjects && (
                    <div style={{ fontSize: "0.78rem", color: "#ccc" }}>
                      📚 <strong>Subjects:</strong> {data.subjects}
                    </div>
                  )}
                </div>

                {data.link && (
                  <a
                    href={data.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ss-btn ss-btn-primary"
                    style={{
                      justifyContent: "center",
                      gap: 6,
                      fontSize: "0.75rem",
                      padding: "8px 12px",
                      borderRadius: 8,
                      textDecoration: "none",
                      color: "var(--color-primary-foreground)",
                      fontWeight: 700,
                    }}
                  >
                    Join Study Session
                  </a>
                )}
              </div>
            );
          } catch {
            return (
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
            );
          }
        })()
      ) : (
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
      )}
      {meta && (
        <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", marginTop: 2, padding: "0 4px" }}>
          {meta}
        </div>
      )}
    </div>
  );
}
