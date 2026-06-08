import { useRef, useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { api } from "../../lib/api-client";
import { toast } from "sonner";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".zip"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function MessageComposer({
  placeholder = "Send a message",
  onSend,
  disabled,
  conversationId,
  channelId,
}: {
  placeholder?: string;
  onSend: (text: string, attachments?: { url: string; kind: string; name: string; size: number }[]) => void;
  disabled?: boolean;
  conversationId?: string;
  channelId?: string;
}) {
  const [v, setV] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const t = v.trim();
    if (!t) return;
    onSend(t);
    setV("");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!conversationId && !channelId) return;
    e.target.value = "";

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error("File type not allowed. Use PDF, DOC, PPT, images, or ZIP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const { file: uploaded } = conversationId
        ? await api.uploadChatFile(conversationId, file)
        : await api.uploadChannelFile(channelId!, file);
      const attachment = { url: uploaded.url, kind: uploaded.kind, name: uploaded.name, size: uploaded.size };
      onSend(`📎 ${uploaded.name}`, [attachment]);
      toast.success("File shared");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTitle, setInviteTitle] = useState("Joint Study Session");
  const [inviteSubjects, setInviteSubjects] = useState("");
  const [inviteLink, setInviteLink] = useState("https://meet.google.com/xyz-abc-123");
  const [inviteTime, setInviteTime] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));

  const handleSendInvite = () => {
    if (!inviteTitle.trim() || !inviteLink.trim()) return;
    const payload = {
      type: "invite",
      title: inviteTitle.trim(),
      subjects: inviteSubjects.trim(),
      link: inviteLink.trim(),
      scheduledAt: new Date(inviteTime).toISOString()
    };
    onSend(JSON.stringify(payload));
    setShowInviteModal(false);
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      style={{
        display: "flex",
        gap: 8,
        padding: "12px 16px",
        borderTop: "1px solid var(--color-border)",
        background: "var(--bg-2)",
        flexShrink: 0,
        alignItems: "center",
      }}
    >
      {showInviteModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16
        }}>
          <div className="ss-card" style={{ width: "100%", maxWidth: 360, background: "var(--bg-2)", border: "1px solid var(--color-border)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="ss-mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-primary)" }}>CREATE STUDY INVITE</span>
              <button type="button" onClick={() => setShowInviteModal(false)} className="ss-btn ss-btn-ghost" style={{ padding: 4 }}>×</button>
            </div>
            
            <div>
              <label style={{ fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4 }}>INVITE TITLE</label>
              <input className="ss-input" value={inviteTitle} onChange={(e) => setInviteTitle(e.target.value)} placeholder="Let's study!" />
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4 }}>SUBJECTS</label>
              <input className="ss-input" value={inviteSubjects} onChange={(e) => setInviteSubjects(e.target.value)} placeholder="e.g. DSA, Operating Systems" />
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4 }}>MEETING LINK</label>
              <input className="ss-input" type="url" value={inviteLink} onChange={(e) => setInviteLink(e.target.value)} placeholder="https://meet.google.com/..." />
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4 }}>TIME</label>
              <input className="ss-input" type="datetime-local" value={inviteTime} onChange={(e) => setInviteTime(e.target.value)} />
            </div>

            <button type="button" onClick={handleSendInvite} className="ss-btn ss-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              Send Invite Card
            </button>
          </div>
        </div>
      )}

      {(conversationId || channelId) && (
        <>
          <input ref={fileRef} type="file" accept={ALLOWED_EXTENSIONS.join(",")} style={{ display: "none" }} onChange={handleFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            className="ss-btn ss-btn-outline"
            style={{ padding: "0 10px", height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="Attach file"
          >
            <Paperclip size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            disabled={disabled || uploading}
            className="ss-btn ss-btn-outline"
            style={{ padding: "0 10px", height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)" }}
            aria-label="Send study invite"
          >
            📅
          </button>
        </>
      )}

      <input
        className="ss-input"
        placeholder={uploading ? "Uploading…" : placeholder}
        value={v}
        onChange={(e) => setV(e.target.value)}
        disabled={disabled || uploading}
        style={{ flex: 1 }}
      />
      <button
        type="submit"
        className="ss-btn ss-btn-primary"
        disabled={disabled || uploading || !v.trim()}
        style={{ padding: "0 14px", height: 38 }}
        aria-label="Send"
      >
        <Send size={16} />
      </button>
    </form>
  );
}
