"use client";

import { useState } from "react";

interface Props {
  onConfirm: (apiKey: string) => void;
}

export default function ApiKeyModal({ onConfirm }: Props) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed.startsWith("sk-")) {
      setError('API keys start with "sk-". Please check and try again.');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div style={m.overlay}>
      <div style={m.card}>
        {/* Header */}
        <div style={m.header}>
          <div style={m.iconWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <div>
            <h2 style={m.title}>Enter your OpenAI API Key</h2>
            <p style={m.subtitle}>Your key is used only for this session and never stored on our servers.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={m.form}>
          <div style={m.inputWrap}>
            <input
              type={show ? "text" : "password"}
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(""); }}
              placeholder="sk-..."
              autoFocus
              style={{ ...m.input, ...(error ? m.inputError : {}) }}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              style={m.eyeBtn}
              onClick={() => setShow((s) => !s)}
              tabIndex={-1}
              title={show ? "Hide key" : "Show key"}
            >
              {show ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && <p style={m.errorMsg}>{error}</p>}

          <button
            type="submit"
            style={{ ...m.submitBtn, opacity: key.trim() ? 1 : 0.5, cursor: key.trim() ? "pointer" : "not-allowed" }}
            disabled={!key.trim()}
          >
            Continue
          </button>
        </form>

        {/* Footer hint */}
        <p style={m.hint}>
          Get your key at{" "}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={m.link}>
            platform.openai.com/api-keys
          </a>
          . GPT-4o access is required.
        </p>
      </div>
    </div>
  );
}

const m: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 10, 40, 0.55)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "28px 28px 22px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 20px 60px rgba(79,70,229,0.18), 0 4px 16px rgba(0,0,0,0.1)",
    border: "1px solid #ede9fe",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 22,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: "#f5f3ff",
    border: "1px solid #ede9fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    margin: "0 0 4px",
    fontSize: 17,
    fontWeight: 700,
    color: "#1e1b4b",
    lineHeight: 1.3,
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.5,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 16,
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: "11px 42px 11px 14px",
    fontSize: 14,
    border: "1.5px solid #ddd6fe",
    borderRadius: 10,
    outline: "none",
    background: "#fafaf9",
    fontFamily: "monospace",
    color: "#1e1b4b",
    boxSizing: "border-box",
    letterSpacing: "0.04em",
  },
  inputError: {
    borderColor: "#fca5a5",
    background: "#fef2f2",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 2,
    display: "flex",
    alignItems: "center",
  },
  errorMsg: {
    margin: "0 0 2px",
    fontSize: 12,
    color: "#dc2626",
    lineHeight: 1.4,
  },
  submitBtn: {
    padding: "11px",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  },
  hint: {
    margin: 0,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 1.5,
  },
  link: {
    color: "#7c3aed",
    textDecoration: "none",
  },
};
