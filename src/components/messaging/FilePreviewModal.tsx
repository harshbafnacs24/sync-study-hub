import { X, Download, ExternalLink } from "lucide-react";
import { BACKEND_URL } from "../../lib/api-client";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    url: string;
    name: string;
    kind: string;
  } | null;
  token: string | null;
}

export function FilePreviewModal({ isOpen, onClose, file, token }: FilePreviewModalProps) {
  if (!isOpen || !file) return null;

  const fileUrl = `${BACKEND_URL}${file.url}${token ? `?token=${token}` : ""}`;
  const downloadUrl = fileUrl.includes("?") ? `${fileUrl}&download=true` : `${fileUrl}?download=true`;

  const isImage = file.kind === "image";
  const isVideo = file.kind === "video";
  const isPdf = file.kind === "pdf";
  const isDoc = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(file.kind);

  // Google Docs Viewer URL for DOCX/PPTX or PDF fallback
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0,0,0,0.9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: "var(--bg-2)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        width: "100%",
        maxWidth: 640,
        maxHeight: "90vh",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            color: "#fff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginRight: 24
          }}>
            📄 Preview: {file.name}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Content Box */}
        <div style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0c0c",
          borderRadius: 8,
          border: "1px solid var(--color-border)",
          minHeight: 320,
          maxHeight: 500,
          position: "relative",
          padding: 8
        }}>
          {isImage && (
            <img src={fileUrl} alt={file.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          )}

          {isVideo && (
            <video src={fileUrl} controls style={{ maxWidth: "100%", maxHeight: "100%" }} />
          )}

          {isPdf && (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
              <iframe
                src={fileUrl}
                style={{ width: "100%", height: "100%", flex: 1, border: "none" }}
                title="PDF Preview"
              />
              <div style={{ fontSize: "0.7rem", color: "var(--color-muted-foreground)", textAlign: "center", marginTop: 8 }}>
                Cannot view PDF? <a href={googleViewerUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>Open in Google Docs Viewer</a>
              </div>
            </div>
          )}

          {isDoc && (
            <iframe
              src={googleViewerUrl}
              style={{ width: "100%", height: "100%", minHeight: 380, border: "none" }}
              title="Document Preview"
            />
          )}

          {!isImage && !isVideo && !isPdf && !isDoc && (
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>📎</div>
              <div style={{ fontSize: "0.85rem", color: "#fff", marginBottom: 4 }}>{file.name}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-muted-foreground)" }}>Preview not available for this file type.</div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <a
            href={downloadUrl}
            download={file.name}
            className="ss-btn ss-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}
          >
            <Download size={14} /> Download
          </a>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ss-btn ss-btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}
          >
            <ExternalLink size={14} /> Open in Tab
          </a>
          <button
            onClick={onClose}
            className="ss-btn ss-btn-ghost"
            style={{ fontSize: "0.78rem" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
