"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "../page";
import UploadButton from "./UploadButton";

interface Props {
  messages: Message[];
  isLoading: boolean;
  disabled: boolean;
  onSend: (message: string) => void;
  onUpload: (files: File[]) => Promise<unknown>;
  uploadedCount: number;
}

export default function ChatWindow({
  messages,
  isLoading,
  disabled,
  onSend,
  onUpload,
  uploadedCount,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const submit = () => {
    if (!input.trim() || isLoading || disabled) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow textarea.
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div style={cw.container}>
      {/* Message list */}
      <div style={cw.feed}>
        {messages.length === 0 && !isLoading && (
          <div style={cw.empty}>
            <div style={cw.emptyAvatar}>A</div>
            <div style={cw.emptyTitle}>Hi, I&apos;m Ava</div>
            <p style={cw.emptyBody}>
              Your O-1 visa advisor. I&apos;m here to help — one step at a time.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...cw.bubble,
              ...(msg.role === "user" ? cw.userBubble : cw.asstBubble),
            }}
          >
            <div style={cw.roleRow}>
              {msg.role === "assistant" && <div style={cw.avatar}>A</div>}
              <div style={cw.role}>{msg.role === "user" ? "You" : "Ava"}</div>
            </div>
            <div style={cw.text}>{msg.content}</div>
          </div>
        ))}

        {isLoading && (
          <div style={{ ...cw.bubble, ...cw.asstBubble }}>
            <div style={cw.roleRow}>
              <div style={cw.avatar}>A</div>
              <div style={cw.role}>Ava</div>
            </div>
            <div style={cw.typing}>
              <span className="typing-dot" style={cw.dot}>●</span>
              <span className="typing-dot" style={cw.dot}>●</span>
              <span className="typing-dot" style={cw.dot}>●</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* File count strip */}
      {uploadedCount > 0 && (
        <div style={cw.fileStrip}>
          <span style={cw.fileStripDot}>●</span>
          {uploadedCount} document{uploadedCount !== 1 ? "s" : ""} attached
        </div>
      )}

      {/* Input row */}
      <form
        style={cw.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <UploadButton compact onUpload={onUpload} disabled={disabled} />
        <textarea
          ref={textareaRef}
          style={cw.textarea}
          rows={1}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Getting things ready — just a moment…"
              : "Share your background or ask Ava about your O-1 criteria… (Enter to send)"
          }
          disabled={disabled || isLoading}
        />
        <button
          type="submit"
          style={{
            ...cw.sendBtn,
            opacity: disabled || isLoading || !input.trim() ? 0.4 : 1,
            cursor: disabled || isLoading || !input.trim() ? "not-allowed" : "pointer",
          }}
          disabled={disabled || isLoading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

const cw: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
  },
  feed: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  // Empty state (fallback)
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "60px 24px",
    flex: 1,
  },
  emptyAvatar: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "#0d9488",
    color: "#fff",
    fontSize: 22,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: "#64748b",
    maxWidth: 380,
    lineHeight: 1.65,
    margin: 0,
  },
  // Message bubbles
  bubble: {
    padding: "10px 14px",
    borderRadius: 12,
    maxWidth: "78%",
    wordBreak: "break-word",
  },
  userBubble: {
    background: "#2563eb",
    color: "#fff",
    alignSelf: "flex-end",
    borderBottomRightRadius: 3,
  },
  asstBubble: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    color: "#1e293b",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 3,
  },
  roleRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#0d9488",
    color: "#fff",
    fontSize: 9,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  role: {
    fontSize: 10,
    fontWeight: 700,
    opacity: 0.55,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  text: { fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap" },
  typing: { display: "flex", gap: 4, fontSize: 18, color: "#94a3b8" },
  dot: {},
  // File count strip
  fileStrip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 20px",
    fontSize: 12,
    color: "#15803d",
    background: "#f0fdf4",
    borderTop: "1px solid #dcfce7",
    flexShrink: 0,
  },
  fileStripDot: {
    fontSize: 8,
    color: "#22c55e",
  },
  // Input form
  form: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    background: "#fff",
    borderTop: "1px solid #e2e8f0",
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    outline: "none",
    background: "#f8fafc",
    resize: "none",
    lineHeight: 1.5,
    fontFamily: "inherit",
    overflowY: "auto",
  },
  sendBtn: {
    padding: "10px 22px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
    height: 42,
  },
};
