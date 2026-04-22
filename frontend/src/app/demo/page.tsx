"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Crown,
  ArrowLeft,
  Coins,
  Loader2,
  MessageSquare,
  Monitor,
  LogIn,
  CheckCircle2,
  Zap,
  Lock,
} from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { PromptInput } from "@/components/PromptInput";
import { CodePreview } from "@/components/CodePreview";
import type {
  GenerationProgress,
  Message,
  StreamChunk,
} from "@/types";
import {
  getFileCount,
  mergeFiles,
  parseMultiFileOutput,
  serializeFileMap,
  type FileMap,
} from "@/lib/parser";
import {
  clearDemoState,
  demoGetSession,
  demoReset,
  demoStart,
  readDemoState,
  writeDemoState,
  type DemoSessionState,
} from "@/lib/demo";
import { useFingerprint } from "@/hooks/useFingerprint";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile, useIsIOS } from "@/hooks/useIsMobile";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type MobileView = "chat" | "preview";

export default function DemoPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const fingerprint = useFingerprint();
  const isMobile = useIsMobile();
  const isIOS = useIsIOS();

  const [session, setSession] = useState<DemoSessionState | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [startError, setStartError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentFiles, setCurrentFiles] = useState<FileMap>({});
  const [generationKey, setGenerationKey] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupReason, setSignupReason] = useState<"credits" | "cap" | "feature">("credits");
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  const [hasNewPreview, setHasNewPreview] = useState(false);

  const [genProgress, setGenProgress] = useState<GenerationProgress>({
    phase: null,
    filesDetected: 0,
    charsReceived: 0,
    streamingCode: "",
  });

  const abortRef = useRef<AbortController | null>(null);
  const codeRef = useRef("");
  const currentFilesRef = useRef<FileMap>({});
  const messagesRef = useRef<Message[]>([]);
  const hasAutoRunRef = useRef(false);

  currentFilesRef.current = currentFiles;
  messagesRef.current = messages;

  // Already logged-in → off to the real app.
  useEffect(() => {
    if (isAuthenticated) router.replace("/app");
  }, [isAuthenticated, router]);

  // Hydrate the demo session from localStorage + backend.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = readDemoState();
      if (cached && !cached.migrated) {
        if (!cancelled) {
          setSession(cached);
          setCurrentFiles(cached.file_map || {});
          setMessages(hydrateChat(cached.chat_history || []));
          if (Object.keys(cached.file_map || {}).length > 0) {
            // Files already exist from a previous visit — trigger a mount+boot.
            setGenerationKey((k) => k + 1);
            setRestartKey((k) => k + 1);
          }
        }
      }
      const fresh = await demoGetSession();
      if (!cancelled && fresh) {
        setSession(fresh);
        setCurrentFiles(fresh.file_map || {});
        setMessages(hydrateChat(fresh.chat_history || []));
      }
      if (!cancelled) setLoadingSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-run the prompt captured from the landing input.
  useEffect(() => {
    if (loadingSession || hasAutoRunRef.current || isLoading) return;
    const initial = sessionStorage.getItem("demo_initial_prompt");
    if (!initial) return;
    sessionStorage.removeItem("demo_initial_prompt");
    hasAutoRunRef.current = true;
    setTimeout(() => handleSubmit(initial), 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingSession]);

  function hydrateChat(history: { role: string; content: string }[]): Message[] {
    return history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m, i) => ({
        id: `hist-${i}`,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: Date.now() - (history.length - i) * 1000,
        type: "chat" as const,
      }));
  }

  const creditsNum = useMemo(() => {
    if (!session) return 0;
    return parseFloat(session.credits_remaining);
  }, [session]);
  const hasCredits = creditsNum > 0;

  async function ensureSession(): Promise<DemoSessionState | null> {
    if (session && !session.migrated) return session;
    try {
      const s = await demoStart({
        fingerprint: fingerprint || "",
        framework: "react",
      });
      setSession(s);
      return s;
    } catch (err) {
      const e = err as { error?: string; status?: number };
      setStartError(
        e?.status === 429
          ? e.error || "Has alcanzado el límite de demos gratuitas."
          : e?.error || "No se pudo iniciar la demo."
      );
      return null;
    }
  }

  // Prompt history compression — mirrors buildCompressedPayload from /generate
  // (but uses the last messages we have locally).
  const buildCompressedPayload = useCallback(() => {
    return messagesRef.current
      .filter((m) => m.content && (m.role === "user" || m.role === "assistant"))
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));
  }, []);

  const unescapeStreamingCode = (s: string) => {
    if (s.includes("\\n")) {
      return s
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return s;
  };

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const isDev = process.env.NODE_ENV !== "production";

  const handleDevReset = useCallback(async () => {
    abortRef.current?.abort();
    clearDemoState();
    const fresh = await demoReset();
    if (fresh) {
      setSession(fresh);
      setCurrentFiles({});
      setMessages([]);
      // Force-unmount the CodePreview so WebContainer tears down cleanly.
      setGenerationKey(0);
      setRestartKey(0);
      setGenProgress({
        phase: null,
        filesDetected: 0,
        charsReceived: 0,
        streamingCode: "",
      });
    } else {
      // No existing cookie — create a fresh session.
      try {
        const s = await demoStart({ fingerprint: fingerprint || "", framework: "react" });
        setSession(s);
        setCurrentFiles({});
        setMessages([]);
        setGenerationKey(0);
        setRestartKey(0);
      } catch {
        /* ignore */
      }
    }
  }, [fingerprint]);

  const handleSubmit = useCallback(
    async (prompt: string) => {
      const s = await ensureSession();
      if (!s) return;
      if (parseFloat(s.credits_remaining) <= 0) {
        setSignupReason("credits");
        setShowSignupModal(true);
        return;
      }

      setIsLoading(true);
      setGenProgress({
        phase: "analyzing",
        filesDetected: 0,
        charsReceived: 0,
        streamingCode: "",
      });

      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const streamingMsgId = crypto.randomUUID();
      let receivedUsage:
        | { inputTokens: number; outputTokens: number; cost: number }
        | null = null;

      try {
        const res = await fetch(`${API_BASE}/demo/generate/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });

        if (!res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const err = await res.json();
          throw new Error(err.error || "Failed to generate");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");
        const decoder = new TextDecoder();

        let fullCode = "";
        let chatText = "";
        let buffer = "";
        let hasCode = false;
        let hasChat = false;
        let hasPhasedCode = false;
        const phasedFiles: Record<string, string> = {};
        let switchedToPreview = false;
        let currentFileCodeRaw = "";

        function switchToPreviewOnce() {
          if (!switchedToPreview && window.innerWidth < 768) {
            switchedToPreview = true;
            setMobileView("preview");
            setHasNewPreview(false);
          }
        }

        function processLine(line: string) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) return;
          const jsonStr = trimmed.slice(6);
          let chunk: StreamChunk;
          try {
            chunk = JSON.parse(jsonStr);
          } catch {
            return;
          }

          if (chunk.type === "thinking" && chunk.content) {
            setGenProgress((prev) => ({
              ...prev,
              phase: "planning" as const,
              thinking: chunk.content,
            }));
          }

          if (chunk.type === "plan" && chunk.tasks) {
            switchToPreviewOnce();
            setGenProgress((prev) => ({
              ...prev,
              phase: "writing-files" as const,
              tasks: chunk.tasks,
              currentTaskIndex: -1,
              completedFiles: [],
            }));
          }

          if (chunk.type === "task_start") {
            switchToPreviewOnce();
            currentFileCodeRaw = "";
            setGenProgress((prev) => ({
              ...prev,
              phase: "writing-files" as const,
              currentTaskIndex: chunk.index ?? 0,
              currentTaskFile: chunk.file_path,
              charsReceived: 0,
              streamingCode: "",
            }));
          }

          if (chunk.type === "file_chunk" && chunk.content) {
            currentFileCodeRaw += chunk.content;
            const unescapedFile = unescapeStreamingCode(currentFileCodeRaw);
            const fileMatches = unescapedFile.match(/--- FILE: [^\n]+/g);
            const filesDetected = fileMatches?.length || 0;
            setGenProgress((prev) => ({
              ...prev,
              charsReceived: (prev.charsReceived || 0) + chunk.content!.length,
              filesDetected,
              streamingCode: unescapedFile,
            }));
          }

          if (chunk.type === "task_done" && chunk.file_path) {
            hasPhasedCode = true;
            currentFileCodeRaw = "";
            const filePath = chunk.file_path;
            const fileContent = chunk.content || "";
            if (fileContent) {
              phasedFiles[filePath] = fileContent;
              // NOTE: same pattern as /generate — update files mid-stream WITHOUT
              // bumping generationKey/restartKey. CodePreview ignores mid-stream
              // file changes and only mounts/restarts when we bump keys at the end.
              setCurrentFiles((prev) => ({ ...prev, [filePath]: fileContent }));
            }
            setGenProgress((prev) => ({
              ...prev,
              streamingCode: "",
              completedFiles: [...(prev.completedFiles || []), filePath],
              currentTaskIndex: (prev.currentTaskIndex ?? -1) + 1,
            }));
          }

          if (chunk.type === "review_start") {
            setGenProgress((prev) => ({
              ...prev,
              phase: "reviewing" as const,
              streamingCode: "",
            }));
          }

          if (chunk.type === "fix_iteration_start") {
            setGenProgress((prev) => ({
              ...prev,
              phase: "fixing" as const,
              streamingCode: "",
              charsReceived: 0,
            }));
          }

          if (chunk.type === "fix_progress") {
            setGenProgress((prev) => ({
              ...prev,
              charsReceived: chunk.chars_received ?? prev.charsReceived,
            }));
          }

          if (chunk.type === "fix_iteration_done") {
            const patched = chunk.patched_files ?? [];
            const patchedCount = patched.length;
            const fixMessage: Message = {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content:
                patchedCount > 0
                  ? `🔧 Revisión automática completada — se corrigieron ${patchedCount} archivo${patchedCount !== 1 ? "s" : ""}: ${patched.join(", ")}`
                  : "✅ Revisión automática completada — sin errores encontrados.",
              timestamp: Date.now(),
              type: "chat" as const,
            };
            setMessages((prev) => [...prev, fixMessage]);
          }

          if (chunk.type === "text" && chunk.content) {
            switchToPreviewOnce();
            hasCode = true;
            fullCode += chunk.content;
            codeRef.current = fullCode;
            const unescaped = unescapeStreamingCode(fullCode);
            const fileMatches = unescaped.match(/--- FILE: [^\n]+/g);
            const filesDetected = fileMatches?.length || 0;
            const phase = filesDetected > 0 ? ("writing-files" as const) : ("writing" as const);
            setGenProgress({
              phase,
              filesDetected,
              charsReceived: fullCode.length,
              streamingCode: unescaped,
            });
          }

          if (chunk.type === "chat" && chunk.content) {
            hasChat = true;
            chatText += chunk.content;
            setMessages((prev) => {
              const existing = prev.find((m) => m.id === streamingMsgId);
              if (existing) {
                return prev.map((m) =>
                  m.id === streamingMsgId ? { ...m, content: chatText } : m
                );
              }
              return [
                ...prev,
                {
                  id: streamingMsgId,
                  role: "assistant" as const,
                  content: chatText,
                  timestamp: Date.now(),
                  type: "chat" as const,
                },
              ];
            });
          }

          if (chunk.type === "usage" && chunk.usage) {
            receivedUsage = chunk.usage;
            const u = chunk.usage as { creditsRemaining?: number };
            if (typeof u.creditsRemaining === "number") {
              setSession((prev) =>
                prev
                  ? {
                      ...prev,
                      credits_remaining: u.creditsRemaining!.toFixed(6),
                    }
                  : prev
              );
            }
          }

          if (chunk.type === "error") {
            const code = chunk.code;
            const msg = chunk.error || "Generation error";
            if (code === "demo_credits_exhausted") {
              setSignupReason("credits");
              setShowSignupModal(true);
              return;
            }
            if (code === "demo_cap_reached") {
              setSignupReason("cap");
              setShowSignupModal(true);
              return;
            }
            throw new Error(msg);
          }
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          for (const line of lines) processLine(line);
        }
        buffer += decoder.decode();
        if (buffer.trim()) {
          const remaining = buffer.split("\n\n");
          for (const line of remaining) processLine(line);
        }

        // Finalize — phased mode
        if (hasPhasedCode) {
          const finalFiles = { ...currentFilesRef.current, ...phasedFiles };
          currentFilesRef.current = finalFiles;
          setCurrentFiles(finalFiles);
          setGenerationKey((k) => k + 1);
          setRestartKey((k) => k + 1);
          setGenProgress((prev) => ({ ...prev, phase: "mounting" }));

          if (window.innerWidth < 768) {
            setMobileView("preview");
            setHasNewPreview(false);
          } else {
            setHasNewPreview(true);
          }

          const fileCount = getFileCount(finalFiles);
          const codeMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: `Generado${fileCount !== 1 ? "s" : ""} ${fileCount} archivo${fileCount !== 1 ? "s" : ""} y renderizado en vista previa.`,
            timestamp: Date.now(),
            usage: receivedUsage ?? undefined,
            rawCode: serializeFileMap(finalFiles),
            type: "code" as const,
          };
          setMessages((prev) => [...prev, codeMessage]);
        }

        // Finalize — single-shot fallback
        if (hasCode && codeRef.current.trim()) {
          const { files: incomingFiles, deletions } = parseMultiFileOutput(codeRef.current);
          const existingFiles = currentFilesRef.current;
          const hasExisting = Object.keys(existingFiles).length > 0;
          const finalFiles = hasExisting
            ? mergeFiles(existingFiles, incomingFiles, deletions)
            : incomingFiles;

          setGenProgress((prev) => ({ ...prev, phase: "mounting" }));
          setCurrentFiles(finalFiles);
          currentFilesRef.current = finalFiles;
          setGenerationKey((k) => k + 1);
          setRestartKey((k) => k + 1);

          if (window.innerWidth < 768) {
            setMobileView("preview");
            setHasNewPreview(false);
          } else {
            setHasNewPreview(true);
          }

          const fileCount = getFileCount(finalFiles);
          const codeMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: `Generado${fileCount !== 1 ? "s" : ""} ${fileCount} archivo${fileCount !== 1 ? "s" : ""}.`,
            timestamp: Date.now(),
            usage: receivedUsage ?? undefined,
            rawCode: serializeFileMap(finalFiles),
            type: "code" as const,
          };
          setMessages((prev) => [...prev, codeMessage]);
        }

        // Chat-only response — nothing to do, assistant bubble already appended.
        if (!hasPhasedCode && !hasCode && !hasChat) {
          // no-op
        }
      } catch (err) {
        const e = err as Error;
        if (e.name !== "AbortError") {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== streamingMsgId),
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: `Error: ${e.message || "Error desconocido"}`,
              timestamp: Date.now(),
              type: "error" as const,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: "Generación cancelada.",
              timestamp: Date.now(),
              type: "error" as const,
            },
          ]);
        }
      } finally {
        codeRef.current = "";
        abortRef.current = null;
        setIsLoading(false);
        setGenProgress({
          phase: null,
          filesDetected: 0,
          charsReceived: 0,
          streamingCode: "",
        });
        // Authoritative credit refresh.
        demoGetSession().then((fresh) => {
          if (fresh) {
            setSession(fresh);
            writeDemoState(fresh);
          }
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, fingerprint]
  );

  // Early returns AFTER hooks — keeps hook order stable across renders.
  if (startError) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0f] text-white px-6">
        <div
          className="max-w-md rounded-2xl p-6 text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h1 className="text-2xl font-bold mb-2">Demo no disponible</h1>
          <p className="text-white/60 mb-4">{startError}</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
          >
            Crear cuenta gratis
          </Link>
        </div>
      </div>
    );
  }

  if (loadingSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  const showChat = !isMobile || mobileView === "chat";
  const showPreview = !isMobile || mobileView === "preview";

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-base text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </Link>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-base font-semibold truncate">Demo gratuita</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="hidden sm:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Coins className="w-3 h-3 text-amber-400" />
            <span className="text-muted-foreground">Saldo demo:</span>
            <span
              className={
                creditsNum > 0 ? "font-semibold" : "text-red-400 font-semibold"
              }
            >
              ${creditsNum.toFixed(2)}
            </span>
          </div>
          {isDev && (
            <button
              type="button"
              onClick={handleDevReset}
              title="Dev: limpiar sesión demo (créditos, archivos, historial)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-amber-300 border border-amber-400/25 bg-amber-400/5 hover:bg-amber-400/10 transition-colors"
            >
              <span>Reset</span>
              <span className="hidden sm:inline text-amber-300/60">(dev)</span>
            </button>
          )}
          <Link
            href="/register"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
          >
            <Crown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guardar proyecto</span>
            <span className="sm:hidden">Guardar</span>
          </Link>
        </div>
      </header>

      {/* Mobile view toggle */}
      {isMobile && (
        <div className="shrink-0 flex border-b">
          <button
            type="button"
            onClick={() => setMobileView("chat")}
            className={`flex-1 py-3 text-[15px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              mobileView === "chat"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileView("preview");
              setHasNewPreview(false);
            }}
            className={`flex-1 py-3 text-[15px] font-semibold flex items-center justify-center gap-1.5 transition-colors relative ${
              mobileView === "preview"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Preview
            {hasNewPreview && (
              <span className="absolute top-2 right-[38%] w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Chat panel */}
        {showChat && (
          <div className="md:w-[400px] md:shrink-0 flex flex-col border-r bg-background min-h-0">
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              genProgress={genProgress}
            />
            <PromptInput
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
              chatHistory={buildCompressedPayload()}
            />
          </div>
        )}

        {/* Preview */}
        {showPreview && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {Object.keys(currentFiles).length === 0 && !isLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
                Tu vista previa aparecerá aquí cuando se genere el primer archivo.
              </div>
            ) : (
              <CodePreview
                files={currentFiles}
                generationKey={generationKey}
                restartKey={restartKey}
                framework="react"
                isMobile={isMobile}
                isIOS={isIOS}
                genProgress={genProgress}
                onDemoGate={() => {
                  setSignupReason("feature");
                  setShowSignupModal(true);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Signup modal */}
      {showSignupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowSignupModal(false)}
        >
          <div
            className="max-w-md w-full rounded-2xl p-7 text-center"
            style={{
              background:
                "linear-gradient(160deg, rgba(139,92,246,0.18) 0%, rgba(10,10,15,0.98) 60%)",
              border: "1px solid rgba(139,92,246,0.35)",
              boxShadow: "0 24px 60px -12px rgba(139,92,246,0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
            >
              {signupReason === "cap" ? (
                <Zap className="w-8 h-8 text-white" />
              ) : signupReason === "feature" ? (
                <Lock className="w-8 h-8 text-white" />
              ) : (
                <Crown className="w-8 h-8 text-white" />
              )}
            </div>

            {/* Headline */}
            {signupReason === "cap" ? (
              <>
                <h2 className="text-2xl font-black mb-1 text-white">
                  Límite de la demo alcanzado
                </h2>
                <p className="text-white/60 text-sm mb-5">
                  La demo gratuita incluye{" "}
                  <strong className="text-white">7 generaciones</strong> sin
                  necesidad de registro. Crea tu cuenta gratis en segundos y sigue
                  construyendo sin límites, a{" "}
                  <strong className="text-white">coste cero</strong>.
                </p>
              </>
            ) : signupReason === "feature" ? (
              <>
                <h2 className="text-2xl font-black mb-1 text-white">
                  Crea una cuenta para continuar
                </h2>
                <p className="text-white/60 text-sm mb-5">
                  Ver el código fuente y descargar el proyecto son funciones{" "}
                  <strong className="text-white">exclusivas de cuenta</strong>.{" "}
                  Regístrate gratis.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black mb-1 text-white">
                  ¡Tu saldo demo se agotó!
                </h2>
                <p className="text-white/60 text-sm mb-5">
                  Regístrate gratis y te guardamos tu proyecto +{" "}
                  <strong className="text-white">3 € de crédito extra</strong>{" "}
                  (5 € en total el primer mes).
                </p>
              </>
            )}

            {/* Benefits */}
            <ul className="text-left space-y-2 mb-6">
              {[
                "Muchas más iteraciones incluidas",
                "Proyecto guardado automáticamente en la nube",
                "Acceso a modelos más potentes (GPT-4o, Claude, Gemini)",
              ].map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <span className="text-white/80">{benefit}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col gap-2.5">
              <Link
                href="/register"
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                  boxShadow: "0 6px 20px -4px rgba(139,92,246,0.5)",
                }}
              >
                <Sparkles className="w-4 h-4" />
                Crear cuenta gratis
              </Link>
              <Link
                href="/login"
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-white/10"
                style={{
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <LogIn className="w-4 h-4" />
                Ya tengo cuenta — Iniciar sesión
              </Link>
              <button
                type="button"
                onClick={() => setShowSignupModal(false)}
                className="text-xs text-white/30 hover:text-white/60 py-1.5 transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
