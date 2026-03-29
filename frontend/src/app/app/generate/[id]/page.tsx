"use client";

import { useState, useCallback, useRef, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPatch, apiPost, API_BASE } from "@/lib/api";
import type { ProjectDetail, ChatMessageResponse, PaginatedResponse } from "@/types/auth";
import { ChatPanel } from "@/components/ChatPanel";
import { PromptInput } from "@/components/PromptInput";
import { CodePreview } from "@/components/CodePreview";
import { SessionStatsBar } from "@/components/TokenUsage";
import { Message, SessionStats, StreamChunk, GenerationProgress } from "@/types";
import { parseMultiFileOutput, mergeFiles, serializeFileMap, type FileMap, getFileCount } from "@/lib/parser";
import { MAX_CHAT_HISTORY } from "@/lib/prompts";
import { Sparkles, MessageSquare, Monitor, ArrowLeft, Coins, Loader2, Pencil, Check, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useIsMobile, useIsIOS } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/ModelSelector";
import { DEFAULT_MODEL, type ModelId } from "@/lib/pricing";
import { useModels } from "@/context/ModelsContext";

type MobileView = "chat" | "preview";

export default function GenerateProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = parseInt(id, 10);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { balance, refreshBalance, planType } = useAuth();
  const { isValidModelId, defaultModel } = useModels();

  const [projectName, setProjectName] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentFiles, setCurrentFiles] = useState<FileMap>({});
  const [generationKey, setGenerationKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const codeRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const currentFilesRef = useRef<FileMap>({});
  const messagesRef = useRef<Message[]>([]);
  const autoFixCountRef = useRef(0);
  const MAX_AUTO_FIX_RETRIES = 3;
  const isLoadingRef = useRef(false);
  const initialPromptSentRef = useRef(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    generationCount: 0,
  });
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [hasNewPreview, setHasNewPreview] = useState(false);
  const modelParam = searchParams.get("model");
  const [selectedModel, setSelectedModel] = useState<ModelId>(
    modelParam && isValidModelId(modelParam) ? modelParam : (defaultModel || DEFAULT_MODEL)
  );
  const [genProgress, setGenProgress] = useState<GenerationProgress>({
    phase: null,
    filesDetected: 0,
    charsReceived: 0,
    streamingCode: "",
  });
  const isMobile = useIsMobile();
  const isIOS = useIsIOS();

  currentFilesRef.current = currentFiles;
  messagesRef.current = messages;
  isLoadingRef.current = isLoading;

  // Load project on mount
  useEffect(() => {
    async function loadProject() {
      try {
        const project = await apiGet<ProjectDetail>(`/projects/${projectId}/`);
        setProjectName(project.name);
        if (project.file_map && Object.keys(project.file_map).length > 0) {
          setCurrentFiles(project.file_map);
          currentFilesRef.current = project.file_map;
          setGenerationKey((k) => k + 1);
        }

        // Load chat history
        const messagesData = await apiGet<PaginatedResponse<ChatMessageResponse>>(
          `/projects/${projectId}/messages/`
        );
        if (messagesData.results.length > 0) {
          const loadedMessages: Message[] = messagesData.results.map((m) => ({
            id: String(m.id),
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at).getTime(),
            type: m.message_type as "chat" | "code" | "error",
            usage: m.usage || undefined,
            rawCode: m.raw_code || undefined,
            generationId: m.generation_id ?? undefined,
          }));
          setMessages(loadedMessages);
          messagesRef.current = loadedMessages;
        }
      } catch {
        router.replace("/app/dashboard");
      } finally {
        setIsLoadingProject(false);
      }
    }

    loadProject();
  }, [projectId, router]);

  // Auto-submit initial prompt from query params
  useEffect(() => {
    const initialPrompt = searchParams?.get("prompt");
    if (
      initialPrompt &&
      !isLoading &&
      !isLoadingProject &&
      messages.length === 0 &&
      !initialPromptSentRef.current
    ) {
      initialPromptSentRef.current = true;
      handleSubmit(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading, isLoadingProject, messages.length]);

  const buildCompressedPayload = useCallback(() => {
    const allMsgs = messagesRef.current.filter(
      (m) => m.role === "user" || m.role === "assistant"
    );
    const recentMsgs = allMsgs.slice(-MAX_CHAT_HISTORY);
    return recentMsgs.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  }, []);

  function unescapeStreamingCode(raw: string): string {
    let s = raw;
    s = s.replace(/^\s*\{\s*"code"\s*:\s*"/, "");
    s = s.replace(/"\s*\}\s*$/, "");
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

      const chatHistory = buildCompressedPayload();
      const streamingMsgId = crypto.randomUUID();

      try {
        const res = await fetch(`${API_BASE}/generate/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            project_id: projectId,
            prompt,
            chat_history: chatHistory,
            model: selectedModel,
          }),
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
        let receivedUsage: { inputTokens: number; outputTokens: number; cost: number } | null = null;
        let streamingGenerationId: number | null = null;
        let hasCode = false;
        let hasChat = false;

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

          if (chunk.type === "text" && chunk.content) {
            hasCode = true;
            fullCode += chunk.content;
            codeRef.current = fullCode;

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

          if (chunk.type === "chat" && chunk.content) {
            hasChat = true;
            chatText += chunk.content;
            setMessages((prev) => {
              const existing = prev.find((m) => m.id === streamingMsgId);
              if (existing) {
                return prev.map((m) =>
                  m.id === streamingMsgId ? { ...m, content: chatText } : m
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

          if (chunk.type === "generation_id" && chunk.id) {
            streamingGenerationId = chunk.id;
          }

          if (chunk.type === "error") {
            throw new Error(chunk.error || "Generation error");
          }
        }

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

        buffer += decoder.decode();
        if (buffer.trim()) {
          const remaining = buffer.split("\n\n");
          for (const line of remaining) {
            processLine(line);
          }
        }

        // Finalize
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

          if (window.innerWidth < 768) {
            setMobileView("preview");
            setHasNewPreview(false);
          } else {
            setHasNewPreview(true);
          }

          // Save file_map to backend (also links result to generation for restore)
          try {
            await apiPatch(`/projects/${projectId}/`, {
              file_map: finalFiles,
              ...(streamingGenerationId ? { generation_id: streamingGenerationId } : {}),
            });
          } catch {
            console.error("Failed to save file_map");
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
            generationId: streamingGenerationId ?? undefined,
          };
          setMessages((prev) => [...prev, codeMessage]);
          autoFixCountRef.current = 0;
        }

        if (hasChat && !hasCode && receivedUsage) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingMsgId
                ? { ...m, usage: receivedUsage ?? undefined }
                : m
            )
          );
        }

        if (receivedUsage) {
          setSessionStats((prev) => ({
            totalInputTokens: prev.totalInputTokens + receivedUsage!.inputTokens,
            totalOutputTokens: prev.totalOutputTokens + receivedUsage!.outputTokens,
            totalCost: prev.totalCost + receivedUsage!.cost,
            generationCount: prev.generationCount + 1,
          }));
          // Refresh balance after generation
          refreshBalance();
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
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
    [projectId, buildCompressedPayload, refreshBalance, selectedModel]
  );

  const handleRestore = useCallback(
    async (generationId: number) => {
      if (isRestoring || isLoading) return;
      setIsRestoring(true);
      try {
        const data = await apiPost<{ file_map: Record<string, string> }>(
          `/projects/${projectId}/restore/${generationId}/`,
          {}
        );
        if (data.file_map && Object.keys(data.file_map).length > 0) {
          setCurrentFiles(data.file_map);
          currentFilesRef.current = data.file_map;
          setGenerationKey((k) => k + 1);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: "Project restored to previous version.",
            timestamp: Date.now(),
            type: "chat" as const,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: "Error: Could not restore to this version.",
            timestamp: Date.now(),
            type: "error" as const,
          },
        ]);
      } finally {
        setIsRestoring(false);
      }
    },
    [projectId, isRestoring, isLoading]
  );

  async function handleTitleSave() {
    if (!editedTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await apiPatch(`/projects/${projectId}/`, { name: editedTitle.trim() });
      setProjectName(editedTitle.trim());
      setIsEditingTitle(false);
    } catch {
      setIsEditingTitle(false);
    }
  }

  const handleBuildError = useCallback(
    (errorText: string) => {
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

      const truncatedError = errorText.length > 1500
        ? errorText.slice(0, 1500) + "\n... (truncated)"
        : errorText;

      const fixPrompt = `The preview has a build error (auto-fix attempt ${attempt}/${MAX_AUTO_FIX_RETRIES}):\n\n\`\`\`\n${truncatedError}\n\`\`\`\n\nFix this error. Only modify the files that need changes.`;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user" as const,
          content: `Auto-fix (attempt ${attempt}/${MAX_AUTO_FIX_RETRIES}): Build error detected, requesting fix...`,
          timestamp: Date.now(),
        },
      ]);

      setTimeout(() => {
        handleSubmit(fixPrompt);
      }, 500);
    },
    [handleSubmit]
  );

  if (isLoadingProject) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2 md:py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/app")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                className="flex-1 min-w-0 text-base md:text-lg font-bold bg-transparent border-b border-primary outline-none px-1"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleTitleSave}
              >
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsEditingTitle(false)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditedTitle(projectName);
                setIsEditingTitle(true);
              }}
              className="flex items-center gap-1.5 group flex-1 min-w-0"
            >
              <h1 className="text-base md:text-lg font-bold truncate">
                {projectName}
              </h1>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>

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

        <div className="flex items-center gap-2">
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setChatCollapsed((v) => !v)}
              title={chatCollapsed ? "Show chat" : "Hide chat"}
            >
              {chatCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </Button>
          )}
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={isLoading}
          />
          {balance !== null && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              <Coins className="w-3 h-3" />
              <span>${parseFloat(balance).toFixed(2)}</span>
            </div>
          )}
        </div>
      </header>

      <SessionStatsBar stats={sessionStats} />

      <div className="flex-1 flex overflow-hidden relative">
        <div
          className={`flex flex-col border-r bg-background transition-all duration-300 ${
            isMobile
              ? mobileView === "chat"
                ? "w-full"
                : "hidden"
              : chatCollapsed
              ? "w-0 min-w-0 overflow-hidden border-r-0"
              : "w-[440px] min-w-[360px]"
          }`}
        >
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            genProgress={genProgress}
            onRestore={handleRestore}
            isRestoring={isRestoring}
          />
          <PromptInput
            onSubmit={handleSubmit}
            onCancel={() => abortRef.current?.abort()}
            isLoading={isLoading}
            projectId={projectId}
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
