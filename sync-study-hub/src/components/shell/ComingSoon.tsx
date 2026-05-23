export function ComingSoon({ title, tagline }: { title: string; tagline: string }) {
  return (
    <>
      <div className="ss-ph">
        <div className="ss-logo">S&amp;S</div>
        <div className="ss-ph-row">
          <div>
            <div className="ss-ph-label">{tagline}</div>
            <h1 className="ss-ph-title">{title}</h1>
          </div>
        </div>
      </div>
      <div className="ss-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div className="ss-card" style={{ maxWidth: 320 }}>
          <span className="ss-mono" style={{ fontSize: "0.65rem", letterSpacing: "0.08em", color: "var(--color-primary)", textTransform: "uppercase" }}>
            Coming soon
          </span>
          <p style={{ marginTop: 10, color: "var(--color-muted-foreground)", fontSize: "0.9rem" }}>
            This screen ships in the next milestone. The bottom nav and design system are already in place.
          </p>
        </div>
      </div>
    </>
  );
}
