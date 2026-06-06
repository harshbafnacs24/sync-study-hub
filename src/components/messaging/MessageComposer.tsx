import { useState } from "react";
import { Send, CalendarPlus, X, Clock, Link2 } from "lucide-react";

export function MessageComposer({
  placeholder = "Send a message",
  onSend,
  disabled,
}: {
  placeholder?: string;
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [v, setV] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    title: "",
    subjects: "",
    link: "",
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  const submit = () => {
    const t = v.trim();
    if (!t) return;
    onSend(t);
    setV("");
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.title.trim() || !inviteForm.link.trim()) return;

    const payload = JSON.stringify({
      type: "invite",
      title: inviteForm.title.trim(),
      subjects: inviteForm.subjects.trim(),
      link: inviteForm.link.trim(),
      scheduledAt: new Date(inviteForm.scheduledAt).toISOString(),
    });

    onSend(payload);
    setInviteForm({
      title: "",
      subjects: "",
      link: "",
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    });
    setShowInviteModal(false);
  };

  return (
    <>
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          borderTop: "1px solid var(--color-border)",
          background: "var(--bg-2)",
          flexShrink: 0,
          alignItems: "center"
        }}
      >
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="ss-btn ss-btn-outline"
          style={{ padding: "0 10px", height: 38, display: "flex", alignItems: "center", justifyContent: "center", borderColor: "var(--color-border)", color: "var(--color-primary)" }}
          title="Send Study Invite"
          aria-label="Send Study Invite"
        >
          <CalendarPlus size={16} />
        </button>

        <input
          className="ss-input"
          placeholder={placeholder}
          value={v}
          onChange={(e) => setV(e.target.value)}
          disabled={disabled}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="ss-btn ss-btn-primary"
          disabled={disabled || !v.trim()}
          style={{ padding: "0 14px", height: 38 }}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>

      {/* Invite Modal overlay */}
      {showInviteModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(0,0,0,0.9)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: "#111", border: "1px solid rgba(232, 255, 71, 0.2)",
            borderRadius: 16, padding: 20, width: "100%", maxWidth: 360,
            display: "flex", flexDirection: "column", gap: 14
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CalendarPlus size={16} style={{ color: "var(--color-primary)" }} />
                <h3 className="ss-display" style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>Send Study Invite</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                style={{ background: "none", border: "none", color: "#666", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Session Title</label>
                <input
                  className="ss-input"
                  placeholder="e.g. DSA review - Graph Theory"
                  value={inviteForm.title}
                  onChange={(e) => setInviteForm({ ...inviteForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Subjects to study</label>
                <input
                  className="ss-input"
                  placeholder="e.g. Algorithms, Data Structures"
                  value={inviteForm.subjects}
                  onChange={(e) => setInviteForm({ ...inviteForm, subjects: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Meet Link</label>
                <div style={{ position: "relative" }}>
                  <Link2 size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
                  <input
                    className="ss-input"
                    style={{ paddingLeft: 30 }}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={inviteForm.link}
                    onChange={(e) => setInviteForm({ ...inviteForm, link: e.target.value })}
                    type="url"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Date & Time</label>
                <input
                  className="ss-input"
                  type="datetime-local"
                  value={inviteForm.scheduledAt}
                  onChange={(e) => setInviteForm({ ...inviteForm, scheduledAt: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="ss-btn ss-btn-primary"
                style={{ justifyContent: "center", gap: 8, padding: 10, marginTop: 4 }}
              >
                Send Invite Card
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
