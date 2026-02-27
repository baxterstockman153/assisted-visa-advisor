"use client";

import { useRef, useState } from "react";

type Status = "idle" | "uploading" | "done" | "error";

interface Props {
  onUpload: (files: File[]) => Promise<unknown>;
  disabled: boolean;
}

const ACCEPT = ".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg";

export default function UploadButton({ onUpload, disabled }: Props) {
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
      // Reset to idle after a short success flash.
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
    // Reset so the same file can be re-uploaded if needed.
    e.target.value = "";
  };

  const isActive = !disabled && status !== "uploading";

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
      onDragOver={(e) => { e.preventDefault(); if (isActive) setDragging(true); }}
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
      {status === "done"      && <span style={ub.done}>✓ Indexed</span>}
      {status === "error"     && <span style={ub.error}>✗ {errorMsg}</span>}
      {status === "idle"      && (
        <span style={ub.label}>
          {dragging ? "Drop to upload" : "📎 Upload evidence  (PDF, DOCX, TXT, images)"}
        </span>
      )}
    </div>
  );
}

const ub: Record<string, React.CSSProperties> = {
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
  label:    { pointerEvents: "none" },
  uploading: { color: "#a16207" },
  done:      { color: "#15803d", fontWeight: 600 },
  error:     { color: "#b91c1c" },
};
