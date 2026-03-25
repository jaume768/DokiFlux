"use client";

import { useState, useCallback, useRef } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { PromptInput } from "@/components/PromptInput";
import { CodePreview } from "@/components/CodePreview";
import { SessionStatsBar } from "@/components/TokenUsage";
import { Message, SessionStats, StreamChunk, GenerationProgress } from "@/types";
import { parseMultiFileOutput, mergeFiles, serializeFileMap, type FileMap, getFileCount } from "@/lib/parser";
import { MAX_CHAT_HISTORY } from "@/lib/prompts";
import { Sparkles, MessageSquare, Monitor } from "lucide-react";
import { useIsMobile, useIsIOS } from "@/hooks/useIsMobile";

type MobileView = "chat" | "preview";

export default function GeneratePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentFiles, setCurrentFiles] = useState<FileMap>({});
  const [generationKey, setGenerationKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const codeRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const currentFilesRef = useRef<FileMap>({});
  const messagesRef = useRef<Message[]>([]);
  const autoFixCountRef = useRef(0);
  const MAX_AUTO_FIX_RETRIES = 3;
  const isLoadingRef = useRef(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    generationCount: 0,
  });
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  const [hasNewPreview, setHasNewPreview] = useState(false);
  const [genProgress, setGenProgress] = useState<GenerationProgress>({
    phase: null,
    filesDetected: 0,
    charsReceived: 0,
    streamingCode: "",
  });
  const isMobile = useIsMobile();
  const isIOS = useIsIOS();

  // Keep refs in sync with state so the async callback always reads latest values
  currentFilesRef.current = currentFiles;
  messagesRef.current = messages;
  isLoadingRef.current = isLoading;

  // Build compressed history: currentProject + last N chat messages
  const buildCompressedPayload = useCallback((prompt: string) => {
    const files = currentFilesRef.current;
    const currentProject = Object.keys(files).length > 0
      ? serializeFileMap(files)
      : undefined;

    // Take last N messages (content only, no rawCode) for conversation context
    const allMsgs = messagesRef.current.filter(
      (m) => m.role === "user" || m.role === "assistant"
    );
    const recentMsgs = allMsgs.slice(-MAX_CHAT_HISTORY);
    const chatHistory = recentMsgs.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    return { prompt, currentProject, chatHistory };
  }, []);

  // Unescape raw function call argument JSON for streaming display
  function unescapeStreamingCode(raw: string): string {
    let s = raw;
    // Strip the JSON wrapper: {"code":"..."}
    s = s.replace(/^\s*\{\s*"code"\s*:\s*"/, "");
    // Remove trailing "} if the JSON object is complete
    s = s.replace(/"\s*\}\s*$/, "");
    // Unescape JSON string sequences
    s = s
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    return s;
  }

  const handleSubmit = useCallback(
    async (prompt: string) => {
      setIsLoading(true);
      setGenProgress({ phase: "analyzing", filesDetected: 0, charsReceived: 0, streamingCode: "" });
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const payload = buildCompressedPayload(prompt);

      // Streaming message ID for live chat updates
      const streamingMsgId = crypto.randomUUID();

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to generate");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullCode = "";
        let chatText = "";
        let buffer = "";
        let receivedUsage: { inputTokens: number; outputTokens: number; cost: number } | null = null;
        let hasCode = false;
        let hasChat = false;

        // Helper to process a single SSE line
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

          // Code generation via function call
          if (chunk.type === "text" && chunk.content) {
            hasCode = true;
            fullCode += chunk.content;
            codeRef.current = fullCode;

            // Track streaming progress for UX
            const unescaped = unescapeStreamingCode(fullCode);
            const fileMatches = unescaped.match(/--- FILE: [^\n]+/g);
            const filesDetected = fileMatches?.length || 0;
            const phase = filesDetected > 0 ? "writing-files" as const : "writing" as const;
            setGenProgress({
              phase,
              filesDetected,
              charsReceived: fullCode.length,
              streamingCode: unescaped,
            });
          }

          // Chat text (conversation mode)
          if (chunk.type === "chat" && chunk.content) {
            hasChat = true;
            chatText += chunk.content;
            // Update streaming message in real-time
            setMessages((prev) => {
              const existing = prev.find((m) => m.id === streamingMsgId);
              if (existing) {
                return prev.map((m) =>
                  m.id === streamingMsgId
                    ? { ...m, content: chatText }
                    : m
                );
              } else {
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
              }
            });
          }

          if (chunk.type === "usage" && chunk.usage) {
            receivedUsage = chunk.usage;
          }

          if (chunk.type === "error") {
            throw new Error(chunk.error || "Generation error");
          }
        }

        // Stream loop
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            processLine(line);
          }
        }

        // Flush remaining bytes
        buffer += decoder.decode();
        if (buffer.trim()) {
          const remaining = buffer.split("\n\n");
          for (const line of remaining) {
            processLine(line);
          }
        }

        // --- Finalize: create appropriate messages ---

        // If AI generated code via function call
        if (hasCode && codeRef.current.trim()) {
          const { files: incomingFiles, deletions } = parseMultiFileOutput(codeRef.current);
          const existingFiles = currentFilesRef.current;
          const hasExisting = Object.keys(existingFiles).length > 0;

          let finalFiles: FileMap;
          if (hasExisting) {
            finalFiles = mergeFiles(existingFiles, incomingFiles, deletions);
          } else {
            finalFiles = incomingFiles;
          }

          setGenProgress((prev) => ({ ...prev, phase: "mounting" }));
          setCurrentFiles(finalFiles);
          currentFilesRef.current = finalFiles;
          setGenerationKey((k) => k + 1);

          // Auto-switch to preview on mobile after generation
          if (window.innerWidth < 768) {
            setMobileView("preview");
            setHasNewPreview(false);
          } else {
            setHasNewPreview(true);
          }

          const fileCount = getFileCount(finalFiles);
          const changedCount = Object.keys(incomingFiles).length;
          const deletedCount = deletions.length;

          let summary = `Project generated with ${fileCount} file${fileCount !== 1 ? "s" : ""}`;
          if (hasExisting) {
            summary = `Updated ${changedCount} file${changedCount !== 1 ? "s" : ""}`;
            if (deletedCount > 0) summary += `, deleted ${deletedCount}`;
            summary += ` (${fileCount} total)`;
          }
          summary += " and rendered in preview.";

          const codeMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: summary,
            timestamp: Date.now(),
            usage: receivedUsage ?? undefined,
            rawCode: serializeFileMap(finalFiles),
            type: "code",
          };
          setMessages((prev) => [...prev, codeMessage]);

          // Reset auto-fix counter on successful generation
          autoFixCountRef.current = 0;
        }

        // If AI only chatted (no code), finalize the streaming message with usage
        if (hasChat && !hasCode && receivedUsage) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingMsgId
                ? { ...m, usage: receivedUsage ?? undefined }
                : m
            )
          );
        }

        // Update session stats
        if (receivedUsage) {
          setSessionStats((prev) => ({
            totalInputTokens: prev.totalInputTokens + receivedUsage!.inputTokens,
            totalOutputTokens: prev.totalOutputTokens + receivedUsage!.outputTokens,
            totalCost: prev.totalCost + receivedUsage!.cost,
            generationCount: prev.generationCount + 1,
          }));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Remove any streaming message and add cancel message
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== streamingMsgId),
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: "Generation cancelled.",
              timestamp: Date.now(),
              type: "error" as const,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== streamingMsgId),
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
              timestamp: Date.now(),
              type: "error" as const,
            },
          ]);
        }
      } finally {
        codeRef.current = "";
        abortRef.current = null;
        setIsLoading(false);
        setGenProgress({ phase: null, filesDetected: 0, charsReceived: 0, streamingCode: "" });
      }
    },
    [buildCompressedPayload]
  );

  // Auto-fix: when a build error is detected from the WebContainer, automatically
  // re-submit with the error as context so the AI can fix it (up to N retries)
  const handleBuildError = useCallback(
    (errorText: string) => {
      // Don't auto-fix if already loading or exceeded max retries
      if (isLoadingRef.current) return;
      if (autoFixCountRef.current >= MAX_AUTO_FIX_RETRIES) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: `Auto-fix failed after ${MAX_AUTO_FIX_RETRIES} attempts. The build error persists:\n\n\`\`\`\n${errorText}\n\`\`\`\n\nPlease describe the fix you'd like or try a different approach.`,
            timestamp: Date.now(),
            type: "error" as const,
          },
        ]);
        autoFixCountRef.current = 0;
        return;
      }

      autoFixCountRef.current += 1;
      const attempt = autoFixCountRef.current;

      // Truncate error to avoid sending huge payloads
      const truncatedError = errorText.length > 1500
        ? errorText.slice(0, 1500) + "\n... (truncated)"
        : errorText;

      const fixPrompt = `The preview has a build error (auto-fix attempt ${attempt}/${MAX_AUTO_FIX_RETRIES}):\n\n\`\`\`\n${truncatedError}\n\`\`\`\n\nFix this error. Only modify the files that need changes.`;

      // Add a system-like message indicating auto-fix is happening
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user" as const,
          content: `🔧 Auto-fix (attempt ${attempt}/${MAX_AUTO_FIX_RETRIES}): Build error detected, requesting fix...`,
          timestamp: Date.now(),
        },
      ]);

      // Small delay to let the UI update before starting the generation
      setTimeout(() => {
        handleSubmit(fixPrompt);
      }, 500);
    },
    [handleSubmit]
  );

  return (
    <div className="h-[100dvh] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2 md:py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-base md:text-lg font-bold">Dokiflux</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline">
            MVP
          </span>
        </div>

        {/* Mobile view switcher (top, like v0) */}
        {isMobile && (
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setMobileView("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mobileView === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              onClick={() => {
                setMobileView("preview");
                setHasNewPreview(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative ${
                mobileView === "preview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Preview
              {hasNewPreview && mobileView !== "preview" && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>
        )}

        <div className="text-xs text-muted-foreground hidden sm:block">
          Powered by GPT-5.4
        </div>
      </header>

      {/* Session stats */}
      <SessionStatsBar stats={sessionStats} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop: side-by-side layout */}
        {/* Mobile: show only active view */}

        {/* Chat panel */}
        <div
          className={`flex flex-col border-r bg-background ${
            isMobile
              ? mobileView === "chat"
                ? "w-full"
                : "hidden"
              : "w-[440px] min-w-[360px]"
          }`}
        >
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            genProgress={genProgress}
          />
          <PromptInput
            onSubmit={handleSubmit}
            onCancel={() => abortRef.current?.abort()}
            isLoading={isLoading}
            currentProject={Object.keys(currentFiles).length > 0 ? serializeFileMap(currentFiles) : undefined}
            chatHistory={messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .slice(-MAX_CHAT_HISTORY)
              .map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              }))}
          />
        </div>

        {/* Preview panel */}
        <div
          className={`flex flex-col bg-muted/30 ${
            isMobile
              ? mobileView === "preview"
                ? "w-full"
                : "hidden"
              : "flex-1"
          }`}
        >
          <CodePreview
            files={currentFiles}
            generationKey={generationKey}
            isIOS={isIOS}
            onBuildError={handleBuildError}
            genProgress={genProgress}
          />
        </div>
      </div>

    </div>
  );
}
