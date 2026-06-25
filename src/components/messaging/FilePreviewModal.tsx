import { useState, useEffect } from "react";
import { X, Download, ExternalLink } from "lucide-react";
import { BACKEND_URL, tokenStore } from "../../lib/api-client";

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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !file) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      setBlobUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const loadFile = async () => {
      try {
        const activeToken = token || tokenStore.get();
        const headers: Record<string, string> = {};
        if (activeToken) {
          headers["Authorization"] = `Bearer ${activeToken}`;
        }

        const res = await fetch(`${BACKEND_URL}${file.url}`, { headers });
        if (!res.ok) {
          if (res.status === 401) {
            tokenStore.clear();
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
            throw new Error("Session expired. Please log in again.");
          }
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? `Failed to load file (Status ${res.status})`);
        }

        const blob = await res.blob();
        if (!active) return;

        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err: any) {
        console.error("Error fetching preview file:", err);
        if (active) setError(err?.message ?? "Failed to load preview");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadFile();

    return () => {
      active = false;
    };
  }, [isOpen, file, token]);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (!isOpen || !file) return null;

  const isImage = file.kind === "image";
  const isVideo = file.kind === "video";
  const isPdf = file.kind === "pdf";
  const isDoc = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(file.kind);

  // We still construct a public fallback url for tools like Google Docs Viewer that require it, 
  // but we warn that it won't work on localhost/without public auth.
  const fallbackUrl = `${BACKEND_URL}${file.url}${token ? `?token=${token}` : ""}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fallbackUrl)}&embedded=true`;

  const finalPreviewUrl = blobUrl || fallbackUrl;
  const downloadUrl = blobUrl || (fallbackUrl.includes("?") ? `${fallbackUrl}&download=true` : `${fallbackUrl}?download=true`);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0,0,0,0.85)",
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
          {loading && (
            <div style={{ color: "var(--color-muted-foreground)", textAlign: "center" }}>
              <div className="ss-mono" style={{ fontSize: "0.8rem", marginBottom: 8 }}>Securing session & fetching file...</div>
              <div style={{ display: "inline-block", width: 24, height: 24, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", padding: 24, color: "#ff6b6b" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Failed to load preview</div>
              <div style={{ fontSize: "0.75rem", marginTop: 4 }}>{error}</div>
            </div>
          )}

          {!loading && !error && (
            <>
              {isImage && (
                <img src={finalPreviewUrl} alt={file.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              )}

              {isVideo && (
                <video src={finalPreviewUrl} controls style={{ maxWidth: "100%", maxHeight: "100%" }} />
              )}

              {isPdf && (
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
                  <iframe
                    src={finalPreviewUrl}
                    style={{ width: "100%", height: "100%", flex: 1, border: "none" }}
                    title="PDF Preview"
                  />
                  <div style={{ fontSize: "0.7rem", color: "var(--color-muted-foreground)", textAlign: "center", marginTop: 8 }}>
                    Cannot view PDF? <a href={googleViewerUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>Open in Google Docs Viewer</a>
                  </div>
                </div>
              )}

              {isDoc && (
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 12 }}>
                  <iframe
                    src={googleViewerUrl}
                    style={{ width: "100%", height: "100%", minHeight: 320, border: "none", flex: 1 }}
                    title="Document Preview"
                  />
                  <div style={{ fontSize: "0.7rem", color: "var(--color-muted-foreground)", textAlign: "center" }}>
                    If document does not load, please download it to view on your device.
                  </div>
                </div>
              )}

              {!isImage && !isVideo && !isPdf && !isDoc && (
                <div style={{ textAlign: "center", padding: 24 }}>
                  <div style={{ fontSize: "2rem", marginBottom: 12 }}>📎</div>
                  <div style={{ fontSize: "0.85rem", color: "#fff", marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-muted-foreground)" }}>Preview not available for this file type.</div>
                </div>
              )}
            </>
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
            href={finalPreviewUrl}
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
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
