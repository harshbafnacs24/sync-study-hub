import { useState } from "react";
import { Send } from "lucide-react";

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
  const submit = () => {
    const t = v.trim();
    if (!t) return;
    onSend(t);
    setV("");
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
      }}
    >
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
        style={{ padding: "0 14px" }}
        aria-label="Send"
      >
        <Send size={16} />
      </button>
    </form>
  );
}
