"use client";

import { useState, useCallback, useRef } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { PromptInput } from "@/components/PromptInput";
import { CodePreview } from "@/components/CodePreview";
import { SessionStatsBar } from "@/components/TokenUsage";
import { Message, SessionStats, StreamChunk } from "@/types";
import { parseMultiFileOutput, mergeFiles, serializeFileMap, IncrementalParser, type FileMap, getFileCount } from "@/lib/parser";
import { useWebContainer } from "@/hooks/useWebContainer";
import { Sparkles } from "lucide-react";

export default function GeneratePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentFiles, setCurrentFiles] = useState<FileMap>({});
  const [generationKey, setGenerationKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const codeRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const incrementalParserRef = useRef(new IncrementalParser());
  const currentFilesRef = useRef<FileMap>({});
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    generationCount: 0,
  });

  const { status, previewUrl, error, logs, mountFiles, writeFile, isReady } = useWebContainer();

  const handleSubmit = useCallback(
    async (prompt: string) => {
      setIsLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      codeRef.current = "";
      incrementalParserRef.current.reset();

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.rawCode || m.content,
        }));

      const existingFiles = { ...currentFilesRef.current };
      const hasExisting = Object.keys(existingFiles).length > 0;

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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.slice(6);
            let chunk: StreamChunk;
            try {
              chunk = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            if (chunk.type === "text" && chunk.content) {
              fullCode += chunk.content;
              codeRef.current = fullCode;

              // Incremental preview: detect newly completed files and write them via HMR
              const newFiles = incrementalParserRef.current.getNewlyCompletedFiles(fullCode);
              const newFilePaths = Object.keys(newFiles);
              if (newFilePaths.length > 0) {
                // Update React state with the new files for the code view
                const merged = hasExisting
                  ? { ...existingFiles, ...currentFilesRef.current, ...newFiles }
                  : { ...currentFilesRef.current, ...newFiles };
                currentFilesRef.current = merged;
                setCurrentFiles(merged);

                // Write each completed file to the WebContainer for HMR
                if (isReady) {
                  for (const [path, content] of Object.entries(newFiles)) {
                    writeFile(path, content);
                  }
                }
              }
            }

            if (chunk.type === "usage" && chunk.usage) {
              // Final parse: get all files including the last one
              const { files: incomingFiles, deletions } = parseMultiFileOutput(codeRef.current);

              let finalFiles: FileMap;
              if (hasExisting) {
                finalFiles = mergeFiles(existingFiles, incomingFiles, deletions);
              } else {
                finalFiles = incomingFiles;
              }

              currentFilesRef.current = finalFiles;
              setCurrentFiles(finalFiles);
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
                usage: chunk.usage,
                rawCode: serializeFileMap(finalFiles),
              };
              setMessages((prev) => [...prev, assistantMessage]);

              setSessionStats((prev) => ({
                totalInputTokens:
                  prev.totalInputTokens + chunk.usage!.inputTokens,
                totalOutputTokens:
                  prev.totalOutputTokens + chunk.usage!.outputTokens,
                totalCost: prev.totalCost + chunk.usage!.cost,
                generationCount: prev.generationCount + 1,
              }));
            }

            if (chunk.type === "error") {
              throw new Error(chunk.error || "Generation error");
            }
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
    [messages, isReady, writeFile]
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
          <CodePreview
            files={currentFiles}
            generationKey={generationKey}
            containerStatus={status}
            previewUrl={previewUrl}
            containerError={error}
            containerLogs={logs}
            mountFiles={mountFiles}
          />
        </div>
      </div>
    </div>
  );
}
