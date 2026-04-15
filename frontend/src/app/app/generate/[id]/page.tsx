"use client";

import { useState, useCallback, useRef, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPatch, apiPost, API_BASE, getActiveGeneration, getGenerationStatus, cancelGeneration } from "@/lib/api";
import type { ProjectDetail, ChatMessageResponse, PaginatedResponse } from "@/types/auth";
import { ChatPanel } from "@/components/ChatPanel";
import { PromptInput } from "@/components/PromptInput";
import { CodePreview } from "@/components/CodePreview";
import { SessionStatsBar } from "@/components/TokenUsage";
import { Message, SessionStats, StreamChunk, GenerationProgress } from "@/types";
import { parseMultiFileOutput, mergeFiles, serializeFileMap, type FileMap, getFileCount } from "@/lib/parser";
import { MAX_CHAT_HISTORY } from "@/lib/prompts";
import { Sparkles, MessageSquare, Monitor, ArrowLeft, Coins, Loader2, Pencil, Check, X, PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react";
import { useIsMobile, useIsIOS } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/ModelSelector";
import { DEFAULT_MODEL, type ModelId } from "@/lib/pricing";
import { useModels } from "@/context/ModelsContext";
import { LimitReachedModal, type LimitType } from "@/components/LimitReachedModal";
import { useMobileSidebar } from "@/context/MobileSidebarContext";
import { useActiveGenerations } from "@/context/ActiveGenerationsContext";

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
  const [backgroundGenId, setBackgroundGenId] = useState<number | null>(null);
  const codeRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const streamingGenIdRef = useRef<number | null>(null);
  const currentFilesRef = useRef<FileMap>({});
  const messagesRef = useRef<Message[]>([]);
  const autoFixCountRef = useRef(0);
  const MAX_AUTO_FIX_RETRIES = 3;
  const [isAutoFixing, setIsAutoFixing] = useState(false);
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
  const [limitModal, setLimitModal] = useState<{ open: boolean; type: LimitType } | null>(null);
  const [modelLocked, setModelLocked] = useState(false);
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
  const { toggle: toggleSidebar } = useMobileSidebar();
  const { register: registerBgGen, unregister: unregisterBgGen } = useActiveGenerations();

  currentFilesRef.current = currentFiles;
  messagesRef.current = messages;
  isLoadingRef.current = isLoading;

  // Refresh sidebar title after AI generation completes (~3s)
  useEffect(() => {
    if (!searchParams.get("prompt")) return;
    const t = setTimeout(() => {
      window.dispatchEvent(new Event("sidebar:refresh"));
    }, 3500);
    return () => clearTimeout(t);
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load project on mount
  useEffect(() => {
    let cancelled = false;

    // Reset generation state when projectId changes to avoid stale state from previous project
    setBackgroundGenId(null);
    setIsLoading(false);
    setIsAutoFixing(false);
    setIsLoadingProject(true);
    setMessages([]);
    messagesRef.current = [];
    setCurrentFiles({});
    currentFilesRef.current = {};
    setGenProgress({ phase: null, filesDetected: 0, charsReceived: 0, streamingCode: "" });
    initialPromptSentRef.current = false;

    async function loadProject() {
      try {
        const project = await apiGet<ProjectDetail>(`/projects/${projectId}/`);
        if (cancelled) return;
        setProjectName(project.name);
        if (project.file_map && Object.keys(project.file_map).length > 0) {
          setCurrentFiles(project.file_map);
          currentFilesRef.current = project.file_map;
          setGenerationKey((k) => k + 1);
        }
        if (project.last_used_model && isValidModelId(project.last_used_model)) {
          setSelectedModel(project.last_used_model);
          setModelLocked(true);
        }

        // Load chat history
        const messagesData = await apiGet<PaginatedResponse<ChatMessageResponse>>(
          `/projects/${projectId}/messages/`
        );
        if (cancelled) return;
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
        // Check for active background generation
        const activeGen = await getActiveGeneration(projectId);
        if (cancelled) return;
        if (activeGen.active && activeGen.generation_id) {
          setBackgroundGenId(activeGen.generation_id);
          setIsLoading(true);
          setGenProgress({ phase: null, filesDetected: 0, charsReceived: 0, streamingCode: "" });
        }
      } catch {
        if (!cancelled) router.replace("/app/dashboard");
      } finally {
        if (!cancelled) setIsLoadingProject(false);
      }
    }

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

  // Auto-submit initial prompt from sessionStorage, project description, or legacy query param
  useEffect(() => {
    if (isLoading || isLoadingProject || messages.length > 0 || initialPromptSentRef.current) return;

    // 1. sessionStorage (preferred — avoids long URLs that break Referrer/COOP headers)
    const storageKey = `initial_prompt_${projectId}`;
    let initialPrompt = sessionStorage.getItem(storageKey);
    if (initialPrompt) {
      sessionStorage.removeItem(storageKey);
    }

    // 2. Legacy: ?prompt= query param (backwards compat / shared links)
    if (!initialPrompt) {
      initialPrompt = searchParams?.get("prompt") || null;
    }

    if (initialPrompt) {
      initialPromptSentRef.current = true;
      handleSubmit(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isLoadingProject, messages.length]);

  // Sync background gen state into shared context so the Sidebar can show an indicator
  useEffect(() => {
    if (backgroundGenId) {
      registerBgGen(projectId, backgroundGenId);
    } else {
      unregisterBgGen(projectId);
    }
    return () => {
      unregisterBgGen(projectId);
    };
  }, [backgroundGenId, projectId, registerBgGen, unregisterBgGen]);

  // Poll background generation status
  useEffect(() => {
    if (!backgroundGenId) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await getGenerationStatus(backgroundGenId);
        
        if (status.status === "completed") {
          clearInterval(pollInterval);
          setBackgroundGenId(null);
          setIsLoading(false);
          setGenProgress({ phase: null, filesDetected: 0, charsReceived: 0, streamingCode: "" });
          
          // Load the result
          if (status.result_file_map) {
            setCurrentFiles(status.result_file_map);
            currentFilesRef.current = status.result_file_map;
            setGenerationKey((k) => k + 1);
            autoFixCountRef.current = 0;
          }
          
          // Add completion message
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: `Generación completada (${status.files_changed} archivo${status.files_changed !== 1 ? "s" : ""} modificados).`,
              timestamp: Date.now(),
              type: "code" as const,
              usage: {
                inputTokens: status.input_tokens,
                outputTokens: status.output_tokens,
                cost: status.cost,
              },
              generationId: status.id,
            },
          ]);
          
          refreshBalance();
        } else if (status.status === "failed" || status.status === "cancelled") {
          clearInterval(pollInterval);
          setBackgroundGenId(null);
          setIsLoading(false);
          setGenProgress({ phase: null, filesDetected: 0, charsReceived: 0, streamingCode: "" });
          
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: `Generación ${status.status === "failed" ? "fallida" : "cancelada"}.`,
              timestamp: Date.now(),
              type: "error" as const,
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to poll generation status:", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [backgroundGenId, refreshBalance]);

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
    // Only apply JSON unescaping if the content looks like a JSON tool call wrapper.
    // Plain text output (Anthropic/Gemini text-mode) starts with "// --- FILE:" directly
    // and must NOT have its trailing "}" stripped (would break code ending with "}).
    if (/^\s*\{/.test(s)) {
      s = s.replace(/^\s*\{\s*"code"\s*:\s*"/, "");
      s = s.replace(/"\s*\}\s*$/, "");
      s = s
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return s;
  }

  const handleSubmit = useCallback(
    async (prompt: string, isAutofix = false) => {
      setIsLoading(true);
      setGenProgress({ phase: "analyzing", filesDetected: 0, charsReceived: 0, streamingCode: "" });
      if (window.innerWidth < 768) {
        setMobileView("preview");
      }
      const controller = new AbortController();
      abortRef.current = controller;

      if (!isAutofix) {
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: "user",
          content: prompt,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMessage]);
      }

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
            mode: "phased",
            is_autofix: isAutofix,
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
        let hasPhasedCode = false;
        const phasedFiles: Record<string, string> = {};
        let currentFileCodeRaw = "";

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
            setGenProgress((prev) => ({
              ...prev,
              phase: "writing-files" as const,
              tasks: chunk.tasks,
              currentTaskIndex: -1,
              completedFiles: [],
            }));
          }

          if (chunk.type === "task_start") {
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
              setCurrentFiles((prev) => ({ ...prev, [filePath]: fileContent }));
              setGenerationKey((k) => k + 1);
            }
            setGenProgress((prev) => ({
              ...prev,
              streamingCode: "",
              completedFiles: [...(prev.completedFiles || []), filePath],
              currentTaskIndex: (prev.currentTaskIndex ?? -1) + 1,
            }));
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
            streamingGenIdRef.current = chunk.id;
          }

          if (chunk.type === "error") {
            const msg = chunk.error || "Generation error";
            if (msg.includes("Insufficient credits")) {
              setLimitModal({ open: true, type: "credits" });
              return;
            }
            if (msg.includes("Daily generation limit") || msg.includes("daily") && msg.includes("limit")) {
              setLimitModal({ open: true, type: "daily" });
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

        // Finalize — phased mode: files already updated progressively per task_done
        if (hasPhasedCode) {
          const finalFiles = { ...currentFilesRef.current, ...phasedFiles };
          currentFilesRef.current = finalFiles;
          setCurrentFiles(finalFiles);
          setGenerationKey((k) => k + 1);
          setGenProgress((prev) => ({ ...prev, phase: "mounting" }));

          if (window.innerWidth < 768) {
            setMobileView("preview");
            setHasNewPreview(false);
          } else {
            setHasNewPreview(true);
          }

          try {
            await apiPatch(`/projects/${projectId}/`, {
              file_map: finalFiles,
              ...(streamingGenerationId ? { generation_id: streamingGenerationId } : {}),
            });
          } catch {
            console.error("Failed to save file_map");
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
            generationId: streamingGenerationId ?? undefined,
          };
          setMessages((prev) => [...prev, codeMessage]);
          autoFixCountRef.current = 0;
        }

        // Finalize — standard mode
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

          let summary = `Proyecto generado con ${fileCount} archivo${fileCount !== 1 ? "s" : ""}`;
          if (hasExisting) {
            summary = `Actualizado${changedCount !== 1 ? "s" : ""} ${changedCount} archivo${changedCount !== 1 ? "s" : ""}`;
            if (deletedCount > 0) summary += `, eliminado${deletedCount !== 1 ? "s" : ""} ${deletedCount}`;
            summary += ` (${fileCount} en total)`;
          }
          summary += " y renderizado en vista previa.";

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
              content: "Generación cancelada.",
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
              content: `Error: ${err instanceof Error ? err.message : "Error desconocido"}`,
              timestamp: Date.now(),
              type: "error" as const,
            },
          ]);
        }
      } finally {
        codeRef.current = "";
        abortRef.current = null;
        streamingGenIdRef.current = null;
        setIsLoading(false);
        setIsAutoFixing(false);
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
            content: "Proyecto restaurado a la versión anterior.",
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
            content: "Error: No se pudo restaurar a esta versión.",
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

  const handleAutoFix = useCallback(
    (errorText: string, errorType: "build" | "runtime") => {
      if (isLoadingRef.current) return;
      if (autoFixCountRef.current >= MAX_AUTO_FIX_RETRIES) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: `Autocorrección fallida tras ${MAX_AUTO_FIX_RETRIES} intentos. El error de ${errorType === "build" ? "compilación" : "ejecución"} persiste:\n\n\`\`\`\n${errorText}\n\`\`\`\n\nDescribe cómo quieres solucionarlo o prueba otro enfoque.`,
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

      const fixPrompt = `The preview has a ${errorType} error (auto-fix attempt ${attempt}/${MAX_AUTO_FIX_RETRIES}):\n\n\`\`\`\n${truncatedError}\n\`\`\`\n\nFix this error. Only modify the files that need changes.`;

      setIsAutoFixing(true);
      setTimeout(() => {
        handleSubmit(fixPrompt, true);
      }, 500);
    },
    [handleSubmit]
  );

  const handleBuildError = useCallback(
    (errorText: string) => handleAutoFix(errorText, "build"),
    [handleAutoFix]
  );

  const handleRuntimeError = useCallback(
    (errorText: string) => handleAutoFix(errorText, "runtime"),
    [handleAutoFix]
  );

  const handleCancel = useCallback(async () => {
    if (backgroundGenId) {
      try {
        await cancelGeneration(backgroundGenId);
      } catch (err) {
        console.error("Failed to cancel background generation:", err);
      }
      setBackgroundGenId(null);
      setIsLoading(false);
      setGenProgress({ phase: null, filesDetected: 0, charsReceived: 0, streamingCode: "" });
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
    } else {
      // Pre-cancel on the backend so it won't launch a background task when
      // it detects the client disconnect in the finally block.
      const genId = streamingGenIdRef.current;
      if (genId) {
        try {
          await cancelGeneration(genId);
        } catch (err) {
          console.error("Failed to pre-cancel streaming generation:", err);
        }
      }
      abortRef.current?.abort();
    }
  }, [backgroundGenId]);

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
      <header className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3 border-b bg-background shrink-0 gap-2">
        <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            className="md:hidden shrink-0"
          >
            <Menu className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/app")}
            className="hidden md:flex shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
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
                className="flex-1 min-w-0 text-sm md:text-lg font-bold bg-transparent border-b border-primary outline-none px-1"
                autoFocus
              />
              <Button variant="ghost" size="icon-xs" onClick={handleTitleSave}>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => setIsEditingTitle(false)}>
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
              <h1 className="text-sm md:text-lg font-bold truncate">
                {projectName}
              </h1>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setChatCollapsed((v) => !v)}
              title={chatCollapsed ? "Mostrar chat" : "Ocultar chat"}
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
            disabled={isLoading || modelLocked}
          />
          {balance !== null && (
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              <Coins className="w-3 h-3" />
              <span>${parseFloat(balance).toFixed(2)}</span>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Chat/Preview tab bar — full-width row below header */}
      {isMobile && (
        <div className="flex border-b bg-background shrink-0">
          <button
            onClick={() => setMobileView("chat")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              mobileView === "chat"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => {
              setMobileView("preview");
              setHasNewPreview(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-b-2 relative ${
              mobileView === "preview"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <Monitor className="w-4 h-4" />
            Vista previa
            {hasNewPreview && mobileView !== "preview" && (
              <span className="absolute top-1.5 right-[calc(50%-28px)] w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      )}

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
            isAutoFixing={isAutoFixing}
            isBackgroundGen={!!backgroundGenId}
          />
          <PromptInput
            onSubmit={handleSubmit}
            onCancel={handleCancel}
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
            isMobile={isMobile}
            onBuildError={handleBuildError}
            onRuntimeError={handleRuntimeError}
            genProgress={genProgress}
          />
        </div>
      </div>
      {limitModal?.open && (
        <LimitReachedModal
          type={limitModal.type}
          onClose={() => setLimitModal(null)}
        />
      )}
    </div>
  );
}
