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
}: {
  placeholder?: string;
  onSend: (text: string, attachments?: { url: string; kind: string; name: string; size: number }[]) => void;
  disabled?: boolean;
  conversationId?: string;
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
    if (!file || !conversationId) return;
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
      const { file: uploaded } = await api.uploadChatFile(conversationId, file);
      const attachment = { url: uploaded.url, kind: uploaded.kind, name: uploaded.name, size: uploaded.size };
      onSend(`📎 ${uploaded.name}`, [attachment]);
      toast.success("File shared");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
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
      {conversationId && (
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
