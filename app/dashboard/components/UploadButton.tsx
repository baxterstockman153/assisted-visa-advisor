"use client";

import { useRef, useState } from "react";

type Status = "idle" | "uploading" | "done" | "error";

interface Props {
  onUpload: (files: File[]) => Promise<unknown>;
  disabled: boolean;
  /** When true, renders as a compact "+" icon button instead of the full drag-drop zone. */
  compact?: boolean;
}

const ACCEPT = ".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg";

export default function UploadButton({ onUpload, disabled, compact = false }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    if (!files.length || disabled) return;
    setStatus("uploading");
    setErrorMsg("");
    try {
      await onUpload(files);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setStatus("error");
      setErrorMsg((err as Error).message);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const isActive = !disabled && status !== "uploading";

  // ── Compact mode: small "+" icon button ────────────────────────────────
  if (compact) {
    const compactContent = () => {
      if (status === "uploading") {
        return <span style={{ fontSize: 14, color: "#a16207", lineHeight: 1 }}>…</span>;
      }
      if (status === "done") {
        return <span style={{ fontSize: 16, color: "#15803d", lineHeight: 1 }}>✓</span>;
      }
      if (status === "error") {
        return <span style={{ fontSize: 16, color: "#b91c1c", lineHeight: 1 }}>!</span>;
      }
      return (
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    };

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Attach evidence files (PDF, DOCX, TXT, images)"
        title={
          status === "error"
            ? errorMsg
            : status === "done"
            ? "Files indexed!"
            : "Attach documents — CV, papers, letters, pay stubs…"
        }
        style={{
          ...ub.compact,
          ...(disabled ? ub.disabled : {}),
          ...(dragging ? ub.compactDragging : {}),
          cursor: isActive ? "pointer" : "default",
        }}
        onClick={() => isActive && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && isActive && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (isActive) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          style={{ display: "none" }}
          onChange={handleChange}
        />
        {compactContent()}
      </div>
    );
  }

  // ── Full drag-drop zone ─────────────────────────────────────────────────
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload evidence files"
      style={{
        ...ub.zone,
        ...(dragging ? ub.dragging : {}),
        ...(disabled ? ub.disabled : {}),
        cursor: isActive ? "pointer" : "default",
      }}
      onClick={() => isActive && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && isActive && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (isActive) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        style={{ display: "none" }}
        onChange={handleChange}
      />
      {status === "uploading" && <span style={ub.uploading}>⏳ Uploading &amp; indexing…</span>}
      {status === "done" && <span style={ub.done}>✓ Indexed</span>}
      {status === "error" && <span style={ub.error}>✗ {errorMsg}</span>}
      {status === "idle" && (
        <span style={ub.label}>
          {dragging ? "Drop to upload" : "📎 Upload evidence  (PDF, DOCX, TXT, images)"}
        </span>
      )}
    </div>
  );
}

const ub: Record<string, React.CSSProperties> = {
  // Full zone
  zone: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 16px",
    border: "2px dashed #cbd5e1",
    borderRadius: 8,
    fontSize: 13,
    color: "#64748b",
    background: "#f8fafc",
    transition: "border-color 0.15s, background 0.15s",
    userSelect: "none",
    minWidth: 280,
    height: 38,
  },
  dragging: {
    borderColor: "#2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
  },
  disabled: { opacity: 0.45 },
  label: { pointerEvents: "none" },
  uploading: { color: "#a16207" },
  done: { color: "#15803d", fontWeight: 600 },
  error: { color: "#b91c1c" },
  // Compact mode
  compact: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#f8fafc",
    color: "#64748b",
    transition: "background 0.15s, border-color 0.15s, color 0.15s",
    userSelect: "none",
    flexShrink: 0,
  },
  compactDragging: {
    borderColor: "#2563eb",
    background: "#eff6ff",
    color: "#2563eb",
  },
};
