"use client";

// app/dashboard/page.tsx
// Main dashboard: sidebar (intake progress) | chat window.

import { useEffect, useRef, useState } from "react";
import ChatWindow from "./components/ChatWindow";
import IntakeProgress from "./components/IntakeProgress";
import {
  CASE_STRATEGY,
  IntakeState,
  initIntakeState,
  applyExtracted,
  FieldValue,
} from "@/lib/caseStrategy";
import type { ExtractedField, HistoryItem, DbCriterionRecord, CriterionAssessment } from "../api/chat/route";

// ---------------------------------------------------------------------------
// Types kept for ChatWindow compatibility
// ---------------------------------------------------------------------------

export interface Message {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  // history mirrors messages but is sent to the API (excludes the current in-flight message)
  const historyRef = useRef<HistoryItem[]>([]);

  const [intakeState, setIntakeState] = useState<IntakeState>(() =>
    initIntakeState(CASE_STRATEGY)
  );
  const [criterionAssessment, setCriterionAssessment] = useState<CriterionAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const intakeStartedRef = useRef(false);

  // Call /api/init once on mount to ensure vector stores exist.
  useEffect(() => {
    fetch("/api/init", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setIsInitialized(true);
      })
      .catch((err: Error) => setInitError(err.message));
  }, []);

  // Auto-start intake once initialised.
  useEffect(() => {
    if (isInitialized && !intakeStartedRef.current) {
      intakeStartedRef.current = true;
      callIntakeApi("__init__", intakeState, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  // ── Core API call ────────────────────────────────────────────────────────

  const callIntakeApi = async (
    message: string,
    currentIntakeState: IntakeState,
    addUserMessage: boolean
  ) => {
    setIsLoading(true);

    if (addUserMessage) {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: historyRef.current,
          intakeState: currentIntakeState,
        }),
      });

      const data = (await res.json()) as {
        message?: string;
        extracted?: ExtractedField[];
        criterionAssessment?: CriterionAssessment[];
        intakeComplete?: boolean;
        dbInstances?: DbCriterionRecord[] | null;
        error?: string;
      };

      if (data.error) throw new Error(data.error);

      const asstContent = data.message ?? "(no response)";
      setMessages((prev) => [...prev, { role: "assistant", content: asstContent }]);

      // Update history ref with both turns
      if (addUserMessage) {
        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: message },
          { role: "assistant", content: asstContent },
        ];
      } else {
        historyRef.current = [
          ...historyRef.current,
          { role: "assistant", content: asstContent },
        ];
      }

      // Update strength assessments whenever we get them
      if (data.criterionAssessment && data.criterionAssessment.length > 0) {
        setCriterionAssessment(data.criterionAssessment);
      }

      // Merge extracted fields into intake state
      if (data.extracted && data.extracted.length > 0) {
        const extracted = data.extracted as Array<{
          criterion_name: string;
          field_name: string;
          value: FieldValue;
        }>;
        setIntakeState((prev) => {
          const next = applyExtracted(prev, extracted);
          return next;
        });
      }

      // Log DB instances to console when intake is complete
      if (data.intakeComplete && data.dbInstances) {
        console.log(
          "%c✅ INTAKE COMPLETE — DB Instances",
          "color: #16a34a; font-weight: bold; font-size: 14px;"
        );
        console.log(JSON.stringify(data.dbInstances, null, 2));
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

  // ── User sends a chat message ─────────────────────────────────────────────

  const handleSend = (message: string) => {
    if (!isInitialized || isLoading) return;
    // Capture current intakeState synchronously (before any state updates)
    setIntakeState((prev) => {
      callIntakeApi(message, prev, true);
      return prev;
    });
  };

  // ── Upload evidence files ─────────────────────────────────────────────────

  const handleUpload = async (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { success?: boolean; fileIds?: string[]; error?: string };

    if (!res.ok || data.error) throw new Error(data.error ?? "Upload failed");

    const names = files.map((f) => f.name);
    setUploadedFiles((prev) => [...prev, ...names]);

    // Inject an upload notification into the conversation so the model
    // knows which files are now available and can map them to fields.
    const uploadMsg = `[Uploaded: ${names.join(", ")}]`;
    setIntakeState((prev) => {
      callIntakeApi(uploadMsg, prev, true);
      return prev;
    });

    return data;
  };

  // ── Error screen ──────────────────────────────────────────────────────────

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

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div style={dp.layout}>
      {/* ── Left sidebar: intake progress tracker ── */}
      <aside style={dp.sidebar}>
        <div style={dp.sidebarHead}>
          <span style={dp.sidebarTitle}>Intake Progress</span>
          {!isInitialized && <span style={dp.initBadge}>Initialising…</span>}
        </div>
        <div style={dp.sidebarBody}>
          <IntakeProgress intakeState={intakeState} criterionAssessment={criterionAssessment} />
        </div>
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
  sidebar: {
    width: 300,
    minWidth: 220,
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    borderRight: "1px solid #e8e5ff",
    overflow: "hidden",
  },
  sidebarHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 16px 10px",
    borderBottom: "1px solid #f0efff",
    flexShrink: 0,
  },
  sidebarTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#7c3aed",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  initBadge: {
    fontSize: 10,
    color: "#92400e",
    background: "#fef9c3",
    padding: "1px 6px",
    borderRadius: 4,
  },
  sidebarBody: {
    flex: 1,
    overflowY: "auto",
    padding: 12,
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  },
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
