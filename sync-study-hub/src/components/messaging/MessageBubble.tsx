import { ExternalLink, Users, Clock } from "lucide-react";
import { decodeRoomInvite, type MeetProvider } from "../../lib/types";

const PROVIDER_LABELS: Record<MeetProvider, string> = {
  meet: "Google Meet",
  zoom: "Zoom",
  teams: "Microsoft Teams",
  other: "Meeting Link",
};

const PROVIDER_COLORS: Record<MeetProvider, string> = {
  meet: "#1a73e8",
  zoom: "#2D8CFF",
  teams: "#6264A7",
  other: "var(--color-primary)",
};

interface Props {
  mine: boolean;
  text: string;
  meta?: React.ReactNode;
  system?: boolean;
  authorLabel?: string;
}

export function MessageBubble({ mine, text, meta, system, authorLabel }: Props) {
  // ── System message ──────────────────────────────────────────────────────
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

  // ── Room invite card ─────────────────────────────────────────────────────
  const invite = decodeRoomInvite(text);
  if (invite) {
    const providerKey = (invite.meetProvider ?? "other") as MeetProvider;
    const providerLabel = PROVIDER_LABELS[providerKey] ?? "Meeting Link";
    const accentColor = PROVIDER_COLORS[providerKey] ?? "var(--color-primary)";

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
        {!mine && authorLabel && (
          <div className="ss-mono" style={{ fontSize: "0.62rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", marginLeft: 4 }}>
            {authorLabel}
          </div>
        )}
        <div
          style={{
            maxWidth: "88%",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            borderTopRightRadius: mine ? 4 : 12,
            borderTopLeftRadius: mine ? 12 : 4,
            overflow: "hidden",
            background: "var(--bg-2)",
          }}
        >
          {/* Header bar */}
          <div
            style={{
              background: accentColor,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Users size={14} color="white" />
            <span style={{ color: "white", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em" }}>
              STUDY ROOM INVITE
            </span>
          </div>
          {/* Body */}
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="ss-display" style={{ fontWeight: 800, fontSize: "1rem", lineHeight: 1.2 }}>
              {invite.name}
            </div>
            {invite.subject && (
              <div className="ss-mono" style={{ fontSize: "0.65rem", color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {invite.subject}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-muted-foreground)", fontSize: "0.78rem" }}>
              <Clock size={12} />
              {invite.plannedMinutes} min · hosted by {invite.hostName}
            </div>

            {/* Invite code */}
            <div
              style={{
                background: "var(--bg-3)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                padding: "6px 10px",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <div className="ss-mono" style={{ fontSize: "0.55rem", color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Invite Code
                </div>
                <div className="ss-mono" style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.15em", color: "var(--color-foreground)" }}>
                  {invite.inviteCode}
                </div>
              </div>
              <a
                href={`/rooms?join=${invite.inviteCode}`}
                style={{
                  background: "var(--color-primary)",
                  color: "var(--color-primary-foreground)",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Join Room
              </a>
            </div>

            {/* External meeting link */}
            {invite.meetLink && (
              <a
                href={invite.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: accentColor,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  marginTop: 2,
                }}
              >
                <ExternalLink size={12} />
                Open {providerLabel}
              </a>
            )}
          </div>
        </div>
        {meta && (
          <div className="ss-mono" style={{ fontSize: "0.6rem", color: "var(--color-muted-foreground)", marginTop: 2, padding: "0 4px" }}>
            {meta}
          </div>
        )}
      </div>
    );
  }

  // ── Regular text bubble ──────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
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
