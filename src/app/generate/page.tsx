"use client";

import { useState, useCallback, useRef } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { PromptInput } from "@/components/PromptInput";
import { CodePreview } from "@/components/CodePreview";
import { SessionStatsBar } from "@/components/TokenUsage";
import { Message, SessionStats, StreamChunk } from "@/types";
import { parseMultiFileOutput, mergeFiles, serializeFileMap, type FileMap, getFileCount } from "@/lib/parser";
import { Sparkles } from "lucide-react";

export default function GeneratePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentFiles, setCurrentFiles] = useState<FileMap>({});
  const [generationKey, setGenerationKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const codeRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const currentFilesRef = useRef<FileMap>({});
  const messagesRef = useRef<Message[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    generationCount: 0,
  });

  // Keep refs in sync with state so the async callback always reads latest values
  currentFilesRef.current = currentFiles;
  messagesRef.current = messages;

  const handleSubmit = useCallback(
    async (prompt: string) => {
      setIsLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const history = messagesRef.current
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.rawCode || m.content,
        }));

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, history }),
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
        let buffer = "";
        let receivedUsage: { inputTokens: number; outputTokens: number; cost: number } | null = null;

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

          if (chunk.type === "text" && chunk.content) {
            fullCode += chunk.content;
            codeRef.current = fullCode;
          }

          if (chunk.type === "usage" && chunk.usage) {
            receivedUsage = chunk.usage;
          }

          if (chunk.type === "error") {
            throw new Error(chunk.error || "Generation error");
          }
        }

        // Stream loop — only accumulates text and tracks usage
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

        // Flush: decode any remaining bytes held by TextDecoder
        buffer += decoder.decode();

        // Process any events remaining in buffer
        if (buffer.trim()) {
          const remaining = buffer.split("\n\n");
          for (const line of remaining) {
            processLine(line);
          }
        }

        // --- Always create assistant message after stream ends ---
        if (codeRef.current.trim()) {
          const { files: incomingFiles, deletions } = parseMultiFileOutput(codeRef.current);
          const existingFiles = currentFilesRef.current;
          const hasExisting = Object.keys(existingFiles).length > 0;

          let finalFiles: FileMap;
          if (hasExisting) {
            finalFiles = mergeFiles(existingFiles, incomingFiles, deletions);
          } else {
            finalFiles = incomingFiles;
          }

          setCurrentFiles(finalFiles);
          currentFilesRef.current = finalFiles;
          setGenerationKey((k) => k + 1);

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

          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: summary,
            timestamp: Date.now(),
            usage: receivedUsage ?? undefined,
            rawCode: serializeFileMap(finalFiles),
          };
          setMessages((prev) => [...prev, assistantMessage]);

          if (receivedUsage) {
            setSessionStats((prev) => ({
              totalInputTokens: prev.totalInputTokens + receivedUsage!.inputTokens,
              totalOutputTokens: prev.totalOutputTokens + receivedUsage!.outputTokens,
              totalCost: prev.totalCost + receivedUsage!.cost,
              generationCount: prev.generationCount + 1,
            }));
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          const cancelMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Generation cancelled.",
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, cancelMessage]);
        } else {
          const errorMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        abortRef.current = null;
        setIsLoading(false);
      }
    },
    [] // no deps needed — uses refs for latest state
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Dokiflux</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            MVP
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Powered by GPT-5.4
        </div>
      </header>

      {/* Session stats */}
      <SessionStatsBar stats={sessionStats} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat */}
        <div className="w-[440px] min-w-[360px] border-r flex flex-col">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
          />
          <PromptInput
            onSubmit={handleSubmit}
            onCancel={() => abortRef.current?.abort()}
            isLoading={isLoading}
            history={messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.rawCode || m.content,
              }))}
          />
        </div>

        {/* Right: Preview */}
        <div className="flex-1 flex flex-col bg-muted/30">
          <CodePreview files={currentFiles} generationKey={generationKey} />
        </div>
      </div>
    </div>
  );
}
