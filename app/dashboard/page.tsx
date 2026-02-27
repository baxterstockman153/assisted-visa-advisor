"use client";

// app/dashboard/page.tsx
// Main dashboard: 3-panel layout — criteria sidebar | chat window.

import { useEffect, useState } from "react";
import ChatWindow from "./components/ChatWindow";
import CriteriaCards from "./components/CriteriaCards";

// ---------------------------------------------------------------------------
// Shared types (imported by child components)
// ---------------------------------------------------------------------------

export interface EvidenceItem {
  file_id: string | null;
  snippet: string;
  why_it_matters: string;
}

export interface CriterionEntry {
  criterion_id: string;
  criterion_name: string;
  strength: "strong" | "medium" | "weak";
  rationale: string;
  evidence: EvidenceItem[];
  gaps: string[];
  next_steps: string[];
}

export interface NotSupportedEntry {
  criterion_id: string;
  reason: string;
}

export interface CriteriaAnalysis {
  top_criteria: CriterionEntry[];
  other_possible_criteria: CriterionEntry[];
  not_supported_yet: NotSupportedEntry[];
  classification_guess: string;
  disclaimer: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  analysis?: CriteriaAnalysis;
}

// ---------------------------------------------------------------------------
// Ava's opening message — shown as the first chat bubble on load
// ---------------------------------------------------------------------------

const AVA_GREETING: Message = {
  role: "assistant",
  content:
    "Hi, I'm Ava — your O-1 visa advisor.\n\n" +
    "I know this process can feel stressful and overwhelming, especially when so much is riding on it. You don't have to figure it out alone.\n\n" +
    "Tell me about your background and achievements, and I'll help you understand which O-1 criteria your evidence could support. You can also attach documents using the + button — your CV, publications, recommendation letters, or pay stubs — and I'll reference them directly in my analysis.",
};

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([AVA_GREETING]);
  const [criteria, setCriteria] = useState<CriteriaAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);

  // Call /api/init once on mount to ensure stores exist and cookies are set.
  useEffect(() => {
    fetch("/api/init", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setIsInitialized(true);
      })
      .catch((err: Error) => setInitError(err.message));
  }, []);

  // ── Send a chat message ─────────────────────────────────────────────────

  const handleSend = async (message: string) => {
    if (!isInitialized || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as {
        explanation?: string;
        analysis?: CriteriaAnalysis;
        error?: string;
      };

      if (data.error) throw new Error(data.error);

      const asstMsg: Message = {
        role: "assistant",
        content: data.explanation ?? "(no explanation returned)",
        analysis: data.analysis,
      };
      setMessages((prev) => [...prev, asstMsg]);

      // Update criteria sidebar whenever we get a fresh analysis.
      if (data.analysis) setCriteria(data.analysis);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${(err as Error).message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Upload evidence files ───────────────────────────────────────────────

  const handleUpload = async (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { success?: boolean; fileIds?: string[]; error?: string };

    if (!res.ok || data.error) throw new Error(data.error ?? "Upload failed");
    setUploadedCount((n) => n + files.length);
    return data;
  };

  // ── Error screen ────────────────────────────────────────────────────────

  if (initError) {
    return (
      <div style={dp.errorPage}>
        <h2 style={{ margin: "0 0 8px" }}>Something went wrong</h2>
        <p style={{ color: "#64748b", marginBottom: 12 }}>{initError}</p>
        <p style={{ color: "#94a3b8", fontSize: 13 }}>
          Check your <code>OPENAI_API_KEY</code> and server logs, then refresh.
        </p>
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────────

  return (
    <div style={dp.layout}>
      {/* ── Left sidebar: criteria cards ── */}
      <aside style={dp.sidebar}>
        <div style={dp.sidebarHead}>
          <span style={dp.sidebarTitle}>Criteria Assessment</span>
          {!isInitialized && <span style={dp.initBadge}>Getting ready…</span>}
        </div>
        <div style={dp.sidebarBody}>
          <CriteriaCards criteria={criteria} />
        </div>
      </aside>

      {/* ── Main panel: chat window (with inline upload) ── */}
      <main style={dp.main}>
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          disabled={!isInitialized}
          onSend={handleSend}
          onUpload={handleUpload}
          uploadedCount={uploadedCount}
        />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const dp: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    height: "100vh",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    background: "#f1f5f9",
    overflow: "hidden",
  },
  /* Sidebar */
  sidebar: {
    width: 320,
    minWidth: 240,
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    borderRight: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  sidebarHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 16px 10px",
    borderBottom: "1px solid #f1f5f9",
    flexShrink: 0,
  },
  sidebarTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  initBadge: {
    fontSize: 10,
    color: "#a16207",
    background: "#fef9c3",
    padding: "1px 6px",
    borderRadius: 4,
  },
  sidebarBody: {
    flex: 1,
    overflowY: "auto",
    padding: 12,
  },
  /* Main panel */
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  },
  /* Error page */
  errorPage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    color: "#dc2626",
    fontFamily: "system-ui, sans-serif",
    textAlign: "center",
    padding: 24,
  },
};
