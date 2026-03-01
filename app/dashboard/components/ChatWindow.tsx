"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "../page";

const ACCEPT = ".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg";

type UploadStatus = "idle" | "uploading" | "done" | "error";

const AVA_GREETING = "Hi, I'm Ava.";
const AVA_SUBTITLE =
  "Your O-1 visa advisor. I'll help you map your achievements to the criteria that matter — and build the strongest case for your petition.";

interface Props {
  messages: Message[];
  isLoading: boolean;
  disabled: boolean;
  onSend: (message: string) => void;
  onUpload?: (files: File[]) => Promise<unknown>;
  uploadedFiles?: string[];
}

export default function ChatWindow({ messages, isLoading, disabled, onSend, onUpload, uploadedFiles }: Props) {
  const [input, setInput] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState("");
  const [displayedGreeting, setDisplayedGreeting] = useState("");
  const [greetingDone, setGreetingDone] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Typewriter effect for Ava's greeting — runs once on mount.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      let i = 0;
      intervalId = setInterval(() => {
        i++;
        setDisplayedGreeting(AVA_GREETING.slice(0, i));
        if (i >= AVA_GREETING.length) {
          if (intervalId !== null) clearInterval(intervalId);
          intervalId = null;
          setGreetingDone(true);
        }
      }, 55);
    }, 350);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !onUpload) return;
    e.target.value = "";
    setUploadStatus("uploading");
    setUploadError("");
    try {
      await onUpload(files);
      setUploadStatus("done");
      setTimeout(() => setUploadStatus("idle"), 5000);
    } catch (err) {
      setUploadStatus("error");
      setUploadError((err as Error).message);
    }
  };

  const showIntro = messages.length === 0 && !isLoading;

  return (
    <div style={cw.container}>
      {/* Message feed */}
      <div style={cw.feed}>
        {showIntro && (
          <div style={cw.intro}>
            {/* Ava avatar */}
            <div style={cw.avaAvatar}>A</div>

            {/* Greeting with typewriter */}
            <div style={cw.greeting}>
              {displayedGreeting}
              {!greetingDone && <span className="ava-cursor">|</span>}
            </div>

            {greetingDone && (
              <>
                {/* Subtitle */}
                <p className="fade-slide-in" style={cw.subtitle}>
                  {AVA_SUBTITLE}
                </p>

                {/* 3-step process */}
                <div className="fade-slide-in" style={{ ...cw.steps, animationDelay: "0.08s" }}>
                  <div style={cw.step}>
                    <div style={cw.stepIcon}>📄</div>
                    <div style={cw.stepLabel}>Upload evidence</div>
                  </div>
                  <div style={cw.stepArrow}>→</div>
                  <div style={cw.step}>
                    <div style={cw.stepIcon}>🔍</div>
                    <div style={cw.stepLabel}>Map to criteria</div>
                  </div>
                  <div style={cw.stepArrow}>→</div>
                  <div style={cw.step}>
                    <div style={cw.stepIcon}>✅</div>
                    <div style={cw.stepLabel}>Build your case</div>
                  </div>
                </div>

                {/* Divider */}
                <div className="fade-slide-in" style={{ ...cw.divider, animationDelay: "0.12s" }} />

                {/* Hint */}
                <p
                  className="fade-slide-in"
                  style={{ ...cw.hintText, animationDelay: "0.14s" }}
                >
                  Upload your documents using the{" "}
                  <strong style={{ color: "#7c3aed" }}>+</strong> button, or describe your
                  background to get started:
                </p>

                {/* Example pills */}
                <div
                  className="fade-slide-in"
                  style={{ ...cw.pills, animationDelay: "0.22s" }}
                >
                  <button
                    style={cw.pill}
                    onClick={() =>
                      !disabled &&
                      onSend(
                        "I have a PhD, 20 peer-reviewed papers with 800 citations, and led engineering at a YC startup. What are my best O-1A criteria?"
                      )
                    }
                    disabled={disabled}
                  >
                    "I have a PhD and 20 papers — what are my best O-1A criteria?"
                  </button>
                  <button
                    style={cw.pill}
                    onClick={() =>
                      !disabled &&
                      onSend(
                        "I'm an artist with international exhibitions. How do I qualify for O-1B?"
                      )
                    }
                    disabled={disabled}
                  >
                    "I'm an artist with international exhibitions. How do I qualify for O-1B?"
                  </button>
                </div>
              </>
            )}
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
            <div style={cw.roleLabel}>{msg.role === "user" ? "You" : "Ava"}</div>
            <div style={cw.msgText}>{msg.content}</div>
          </div>
        ))}

        {isLoading && (
          <div style={{ ...cw.bubble, ...cw.asstBubble }}>
            <div style={cw.roleLabel}>Ava</div>
            <div style={cw.typing}>
              <span className="typing-dot" style={cw.dot}>●</span>
              <span className="typing-dot" style={cw.dot}>●</span>
              <span className="typing-dot" style={cw.dot}>●</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Upload status banner — shown above the input form */}
      {uploadStatus !== "idle" && (
        <div
          style={{
            ...cw.uploadBanner,
            ...(uploadStatus === "uploading" ? cw.bannerUploading : {}),
            ...(uploadStatus === "done" ? cw.bannerDone : {}),
            ...(uploadStatus === "error" ? cw.bannerError : {}),
          }}
        >
          {uploadStatus === "uploading" && (
            <>
              <span className="upload-spin" style={{ marginRight: 7, fontSize: 15 }}>⟳</span>
              Uploading &amp; indexing your documents — this may take a moment…
            </>
          )}
          {uploadStatus === "done" && "✓ Documents indexed — Ava can now reference them in her analysis"}
          {uploadStatus === "error" && `⚠ Upload issue: ${uploadError}`}
        </div>
      )}

      {/* Indexed documents bar */}
      {uploadedFiles && uploadedFiles.length > 0 && (
        <div style={cw.filesBar}>
          <span style={cw.filesBarLabel}>Indexed</span>
          <div style={cw.fileChips}>
            {uploadedFiles.map((name, i) => (
              <span key={i} style={cw.fileChip}>
                <span style={cw.fileChipDot}>●</span>
                {name.length > 28 ? name.slice(0, 26) + "…" : name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input form */}
      <form
        style={cw.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          style={{ display: "none" }}
          onChange={handleFileChange}
          disabled={disabled}
        />

        {/* Plus / attach button */}
        <button
          type="button"
          title="Attach documents (PDF, DOCX, TXT, images)"
          style={{
            ...cw.plusBtn,
            ...(uploadStatus === "done" ? cw.plusBtnDone : {}),
            ...(uploadStatus === "error" ? cw.plusBtnError : {}),
            opacity: disabled || uploadStatus === "uploading" ? 0.45 : 1,
            cursor: disabled || uploadStatus === "uploading" ? "not-allowed" : "pointer",
          }}
          disabled={disabled || uploadStatus === "uploading"}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadStatus === "uploading" ? (
            <span className="upload-spin" style={{ fontSize: 17, lineHeight: 1 }}>⟳</span>
          ) : uploadStatus === "done" ? (
            "✓"
          ) : uploadStatus === "error" ? (
            "!"
          ) : (
            "+"
          )}
        </button>

        <textarea
          ref={textareaRef}
          style={cw.textarea}
          rows={1}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Getting everything ready — just a moment…"
              : "Share your background or ask Ava anything… (Enter to send)"
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
    background: "#fafaf9",
  },
  feed: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  /* ── Intro (empty state) ── */
  intro: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px 32px 24px",
    flex: 1,
    maxWidth: 560,
    margin: "0 auto",
    width: "100%",
  },
  avaAvatar: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 20,
    boxShadow: "0 8px 24px rgba(79,70,229,0.22)",
    flexShrink: 0,
    letterSpacing: "-0.01em",
  },
  greeting: {
    fontSize: 30,
    fontWeight: 700,
    color: "#1e1b4b",
    marginBottom: 14,
    letterSpacing: "-0.025em",
    lineHeight: 1.2,
    minHeight: 44,
  },
  subtitle: {
    fontSize: 15,
    color: "#4b5563",
    maxWidth: 460,
    lineHeight: 1.7,
    margin: "0 0 20px",
  },
  steps: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    maxWidth: 460,
    marginBottom: 4,
  },
  step: {
    flex: 1,
    background: "#f5f3ff",
    border: "1px solid #e0deff",
    borderRadius: 10,
    padding: "12px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  stepIcon: {
    fontSize: 20,
    lineHeight: 1,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#4f46e5",
    lineHeight: 1.3,
    textAlign: "center" as const,
  },
  stepArrow: {
    color: "#c4b5fd",
    fontSize: 16,
    flexShrink: 0,
    fontWeight: 300,
  },
  divider: {
    width: "100%",
    maxWidth: 460,
    height: 1,
    background: "#e8e5ff",
    margin: "16px 0 14px",
    flexShrink: 0,
  },
  hintText: {
    fontSize: 13,
    color: "#6b7280",
    margin: "0 0 10px",
    lineHeight: 1.6,
    maxWidth: 460,
  },
  pills: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    maxWidth: 460,
  },
  pill: {
    background: "#f5f3ff",
    border: "1px solid #ddd6fe",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 13,
    color: "#4f46e5",
    cursor: "pointer",
    textAlign: "left",
    lineHeight: 1.5,
    fontStyle: "italic",
    fontFamily: "inherit",
    transition: "background 0.15s, border-color 0.15s",
  },
  /* ── Message bubbles ── */
  bubble: {
    padding: "12px 16px",
    borderRadius: 14,
    maxWidth: "80%",
    wordBreak: "break-word",
  },
  userBubble: {
    background: "#4f46e5",
    color: "#fff",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  asstBubble: {
    background: "#fff",
    border: "1px solid #e8e5ff",
    color: "#1e1b4b",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    boxShadow: "0 1px 4px rgba(79,70,229,0.07)",
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: 700,
    opacity: 0.5,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom: 5,
  },
  msgText: { fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" },
  typing: { display: "flex", gap: 4, fontSize: 18, color: "#a5b4fc" },
  dot: {},
  /* ── Upload status banner ── */
  uploadBanner: {
    display: "flex",
    alignItems: "center",
    padding: "9px 20px",
    fontSize: 13,
    flexShrink: 0,
  },
  bannerUploading: {
    background: "#fffbeb",
    color: "#92400e",
    borderTop: "1px solid #fde68a",
  },
  bannerDone: {
    background: "#f0fdf4",
    color: "#166534",
    borderTop: "1px solid #bbf7d0",
  },
  bannerError: {
    background: "#fef2f2",
    color: "#991b1b",
    borderTop: "1px solid #fecaca",
  },
  /* ── Indexed files bar ── */
  filesBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 16px",
    background: "#f5f3ff",
    borderTop: "1px solid #e8e5ff",
    flexShrink: 0,
    overflowX: "auto",
  },
  filesBarLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#7c3aed",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    flexShrink: 0,
  },
  fileChips: {
    display: "flex",
    gap: 6,
    flexWrap: "nowrap" as const,
    overflowX: "auto" as const,
  },
  fileChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 9px",
    background: "#fff",
    border: "1px solid #ddd6fe",
    borderRadius: 6,
    fontSize: 12,
    color: "#4b5563",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  fileChipDot: {
    fontSize: 7,
    color: "#16a34a",
    lineHeight: 1,
  },
  /* ── Input form ── */
  form: {
    display: "flex",
    gap: 8,
    padding: "14px 16px",
    background: "#fff",
    borderTop: "1px solid #e8e5ff",
    alignItems: "flex-end",
    boxShadow: "0 -2px 10px rgba(79,70,229,0.05)",
  },
  plusBtn: {
    width: 42,
    height: 42,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f3ff",
    border: "1.5px solid #ddd6fe",
    borderRadius: 10,
    fontSize: 22,
    fontWeight: 300,
    color: "#7c3aed",
    flexShrink: 0,
    transition: "background 0.15s, border-color 0.15s",
    lineHeight: 1,
  },
  plusBtnDone: {
    background: "#f0fdf4",
    border: "1.5px solid #bbf7d0",
    color: "#166534",
    fontSize: 16,
    fontWeight: 600,
  },
  plusBtnError: {
    background: "#fef2f2",
    border: "1.5px solid #fecaca",
    color: "#991b1b",
    fontSize: 18,
    fontWeight: 700,
  },
  textarea: {
    flex: 1,
    padding: "10px 14px",
    fontSize: 14,
    border: "1.5px solid #ddd6fe",
    borderRadius: 10,
    outline: "none",
    background: "#fafaf9",
    resize: "none",
    lineHeight: 1.55,
    fontFamily: "inherit",
    overflowY: "auto",
    color: "#1e1b4b",
  },
  sendBtn: {
    padding: "10px 22px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
    height: 42,
    transition: "background 0.15s",
  },
};
