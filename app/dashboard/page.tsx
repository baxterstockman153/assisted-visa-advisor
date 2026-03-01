"use client";

// app/dashboard/page.tsx
// Main dashboard: sidebar (criteria assessment + data collected tabs) | chat window.

import { useEffect, useState } from "react";
import ChatWindow from "./components/ChatWindow";
import CriteriaCards, { WhatWeNeedNext } from "./components/CriteriaCards";
import CriteriaStoragePanel from "./components/CriteriaStoragePanel";
import { mergeInstances } from "@/lib/criteriaStorage";
import type { CriteriaInstance } from "@/lib/criteriaStorage";

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
// Sidebar tab type
// ---------------------------------------------------------------------------

type SidebarTab = "assessment" | "data";

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [criteria, setCriteria] = useState<CriteriaAnalysis | null>(null);
  const [criteriaInstances, setCriteriaInstances] = useState<CriteriaInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<SidebarTab>("assessment");

  // Notify user when new criteria data is collected (switch to data tab once)
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);

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

    const userMsg: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build conversation history (exclude current message — it's sent separately)
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          criteriaInstances,
        }),
      });
      const data = (await res.json()) as {
        explanation?: string;
        analysis?: CriteriaAnalysis;
        criteriaInstances?: CriteriaInstance[];
        error?: string;
      };

      if (data.error) throw new Error(data.error);

      const asstMsg: Message = {
        role: "assistant",
        content: data.explanation ?? "(no explanation returned)",
        analysis: data.analysis,
      };
      setMessages((prev) => [...prev, asstMsg]);

      // Update criteria sidebar when we get a fresh analysis.
      if (data.analysis) setCriteria(data.analysis);

      // Merge newly extracted criteria instances with existing ones.
      if (data.criteriaInstances && data.criteriaInstances.length > 0) {
        setCriteriaInstances((prev) => mergeInstances(prev, data.criteriaInstances!));

        // Auto-switch to data tab the first time we collect instances
        if (!hasAutoSwitched) {
          setActiveTab("data");
          setHasAutoSwitched(true);
        }
      }
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
    setUploadedFiles((prev) => [...prev, ...files.map((f) => f.name)]);
    return data;
  };

  // ── Error screen ────────────────────────────────────────────────────────

  if (initError) {
    return (
      <div style={dp.errorPage}>
        <h2 style={{ margin: "0 0 8px" }}>Initialisation error</h2>
        <p style={{ color: "#64748b", marginBottom: 12 }}>{initError}</p>
        <p style={{ color: "#94a3b8", fontSize: 13 }}>
          Check your <code>OPENAI_API_KEY</code> and server logs, then refresh.
        </p>
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────────

  const pendingCount = criteriaInstances.filter((i) => {
    const pct = i.fields.length > 0
      ? Math.round((i.fields.filter((f) => f.collected).length / i.fields.length) * 100)
      : 100;
    return pct < 100;
  }).length;

  return (
    <div style={dp.layout}>
      {/* ── Left sidebar ── */}
      <aside style={dp.sidebar}>
        {/* Sidebar header with tab switcher */}
        <div style={dp.sidebarHead}>
          {!isInitialized && <span style={dp.initBadge}>Initialising…</span>}
          <div style={dp.tabs}>
            <button
              style={{
                ...dp.tab,
                ...(activeTab === "assessment" ? dp.tabActive : dp.tabInactive),
              }}
              onClick={() => setActiveTab("assessment")}
            >
              Assessment
            </button>
            <button
              style={{
                ...dp.tab,
                ...(activeTab === "data" ? dp.tabActive : dp.tabInactive),
              }}
              onClick={() => setActiveTab("data")}
            >
              Data Collected
              {criteriaInstances.length > 0 && (
                <span
                  style={{
                    ...dp.tabBadge,
                    background: pendingCount > 0 ? "#fef3c7" : "#dcfce7",
                    color: pendingCount > 0 ? "#92400e" : "#15803d",
                  }}
                >
                  {criteriaInstances.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div style={dp.sidebarBody}>
          {activeTab === "assessment" ? (
            <CriteriaCards criteria={criteria} />
          ) : (
            <CriteriaStoragePanel instances={criteriaInstances} />
          )}
        </div>

        {/* Pinned "What We Need Next" footer — only on assessment tab */}
        {activeTab === "assessment" && (
          <WhatWeNeedNext criteria={criteria} onSend={handleSend} />
        )}

        {/* Data tab footer hint */}
        {activeTab === "data" && criteriaInstances.length > 0 && (
          <div style={dp.dataFooter}>
            <div style={dp.dataFooterText}>
              Keep chatting with Ava to fill in missing fields automatically.
            </div>
            <button
              style={dp.switchBtn}
              onClick={() => setActiveTab("assessment")}
            >
              ← Back to Assessment
            </button>
          </div>
        )}
      </aside>

      {/* ── Main panel: chat ── */}
      <main style={dp.main}>
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          disabled={!isInitialized}
          onSend={handleSend}
          onUpload={handleUpload}
          uploadedFiles={uploadedFiles}
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
    background: "#f1f0ff",
    overflow: "hidden",
  },
  /* Sidebar */
  sidebar: {
    width: 320,
    minWidth: 240,
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    borderRight: "1px solid #e8e5ff",
    overflow: "hidden",
  },
  sidebarHead: {
    padding: "10px 12px 0",
    borderBottom: "1px solid #f0efff",
    flexShrink: 0,
  },
  initBadge: {
    display: "inline-block",
    fontSize: 10,
    color: "#92400e",
    background: "#fef9c3",
    padding: "1px 6px",
    borderRadius: 4,
    marginBottom: 6,
  },
  /* Tab switcher */
  tabs: {
    display: "flex",
    gap: 2,
  },
  tab: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "7px 8px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "inherit",
    borderBottom: "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
  },
  tabActive: {
    color: "#7c3aed",
    borderBottomColor: "#7c3aed",
  },
  tabInactive: {
    color: "#94a3b8",
    borderBottomColor: "transparent",
  },
  tabBadge: {
    fontSize: 9,
    fontWeight: 700,
    padding: "1px 5px",
    borderRadius: 10,
  },
  sidebarBody: {
    flex: 1,
    overflowY: "auto",
    padding: 12,
  },
  dataFooter: {
    padding: "10px 12px 12px",
    borderTop: "1px solid #f0efff",
    flexShrink: 0,
  },
  dataFooterText: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 1.45,
    marginBottom: 8,
  },
  switchBtn: {
    display: "block",
    width: "100%",
    padding: "7px",
    background: "none",
    border: "1px solid #ddd6fe",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: "#7c3aed",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "center",
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
