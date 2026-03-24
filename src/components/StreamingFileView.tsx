"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import {
  FileCode2,
  FolderOpen,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react";

interface StreamingFile {
  path: string;
  content: string;
  isComplete: boolean;
}

interface StreamingFileViewProps {
  streamingCode: string;
  filesDetected: number;
  charsReceived: number;
}

function parseStreamingFiles(code: string): StreamingFile[] {
  const files: StreamingFile[] = [];
  const marker = "// --- FILE:";
  const parts = code.split(marker);

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const newlineIdx = part.indexOf("\n");
    if (newlineIdx === -1) {
      const pathRaw = part.replace(/\s*---\s*$/, "").trim();
      if (pathRaw) {
        files.push({ path: pathRaw, content: "", isComplete: false });
      }
      continue;
    }

    const pathLine = part.slice(0, newlineIdx);
    const path = pathLine.replace(/\s*---\s*$/, "").trim();
    const content = part.slice(newlineIdx + 1);
    const isComplete = i < parts.length - 1;

    files.push({ path, content, isComplete });
  }

  return files;
}

function buildFolderTree(files: StreamingFile[]): Map<string, StreamingFile[]> {
  const tree = new Map<string, StreamingFile[]>();

  for (const file of files) {
    const clean = file.path.startsWith("/") ? file.path.slice(1) : file.path;
    const parts = clean.split("/");
    const dir = parts.length > 1 ? parts[0] : "(root)";

    if (!tree.has(dir)) tree.set(dir, []);
    tree.get(dir)!.push(file);
  }

  return tree;
}

function getFileExtColor(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return "text-blue-400";
  if (path.endsWith(".ts") || path.endsWith(".js")) return "text-yellow-400";
  if (path.endsWith(".css")) return "text-pink-400";
  if (path.endsWith(".json")) return "text-green-400";
  return "text-gray-400";
}

function FileName({ path }: { path: string }) {
  const clean = path.startsWith("/") ? path.slice(1) : path;
  const parts = clean.split("/");
  const name = parts[parts.length - 1];
  return <span className={`font-mono ${getFileExtColor(path)}`}>{name}</span>;
}

export function StreamingFileView({
  streamingCode,
  filesDetected,
  charsReceived,
}: StreamingFileViewProps) {
  const files = useMemo(() => parseStreamingFiles(streamingCode), [streamingCode]);
  const folderTree = useMemo(() => buildFolderTree(files), [files]);
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);
  const userSelectedRef = useRef(false);
  const codeEndRef = useRef<HTMLDivElement>(null);
  const treeEndRef = useRef<HTMLDivElement>(null);

  const activeFileIdx = files.length - 1;
  const viewIdx = selectedIdx >= 0 && selectedIdx < files.length ? selectedIdx : activeFileIdx;
  const viewFile = files[viewIdx] ?? null;

  // Handle manual file selection
  function handleSelectFile(idx: number) {
    userSelectedRef.current = true;
    setSelectedIdx(idx);
  }

  // Auto-scroll code to bottom when streaming the active file
  useEffect(() => {
    if (viewIdx === activeFileIdx) {
      codeEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [viewFile?.content, viewIdx, activeFileIdx]);

  // Auto-scroll tree to show new files appearing
  useEffect(() => {
    treeEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [files.length]);

  // Only auto-select latest file if user hasn't manually picked one
  useEffect(() => {
    if (!userSelectedRef.current) {
      setSelectedIdx(-1);
    }
  }, [files.length]);

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 bg-[#1e1e2e]">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        <span className="text-sm text-gray-400">Waiting for code...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/50 shrink-0">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
        <span className="text-xs font-medium text-amber-500">
          Generating{filesDetected > 0 ? ` · ${filesDetected} file${filesDetected !== 1 ? "s" : ""}` : ""}...
        </span>
        <span className="text-[11px] text-muted-foreground ml-auto">
          {(charsReceived / 1000).toFixed(1)}k chars
        </span>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* File tree sidebar */}
        <div className="w-48 shrink-0 border-r border-white/10 bg-[#181825] overflow-auto">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
            Explorer
          </div>
          <div className="px-1 pb-2 space-y-0.5">
            {Array.from(folderTree.entries()).map(([dir, dirFiles]) => (
              <div key={dir}>
                {dir !== "(root)" && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-gray-400">
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    <FolderOpen className="w-4 h-4 text-sky-400" />
                    <span className="text-[13px] font-semibold">{dir}</span>
                  </div>
                )}
                <div className={dir !== "(root)" ? "ml-3" : ""}>
                  {dirFiles.map((file) => {
                    const globalIdx = files.indexOf(file);
                    const isActive = globalIdx === viewIdx;
                    const isWriting = globalIdx === activeFileIdx && !file.isComplete;

                    return (
                      <button
                        key={file.path}
                        onClick={() => handleSelectFile(globalIdx)}
                        className={`flex items-center gap-1.5 w-full px-2 py-[3px] rounded text-[12px] transition-colors duration-150 ${
                          isActive
                            ? "bg-white/10 text-gray-100"
                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                        }`}
                      >
                        {isWriting ? (
                          <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
                        ) : file.isComplete ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <FileCode2 className={`w-3 h-3 shrink-0 ${getFileExtColor(file.path)}`} />
                        )}
                        <FileName path={file.path} />
                        {isWriting && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={treeEndRef} />
          </div>
        </div>

        {/* Code viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e2e]">
          {/* File tab bar */}
          {viewFile && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-[#252536] shrink-0">
              <FileCode2 className={`w-3.5 h-3.5 shrink-0 ${getFileExtColor(viewFile.path)}`} />
              <span className="text-xs font-mono text-gray-300 truncate">
                {viewFile.path.startsWith("/") ? viewFile.path.slice(1) : viewFile.path}
              </span>
              {viewIdx === activeFileIdx && !viewFile.isComplete && (
                <span className="flex items-center gap-1 ml-auto text-[10px] text-amber-400 shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  writing...
                </span>
              )}
              {viewFile.isComplete && (
                <span className="flex items-center gap-1 ml-auto text-[10px] text-emerald-400 shrink-0">
                  <Check className="w-3 h-3" />
                  done
                </span>
              )}
            </div>
          )}

          {/* Code content */}
          <div className="flex-1 overflow-auto">
            {viewFile ? (
              <div className="relative">
                {/* Line numbers + code */}
                <pre className="p-4 text-[13px] font-mono leading-relaxed whitespace-pre-wrap">
                  {viewFile.content.split("\n").map((line, i) => (
                    <div key={i} className="flex">
                      <span className="inline-block w-8 shrink-0 text-right pr-4 text-gray-600 select-none text-[11px] leading-relaxed">
                        {i + 1}
                      </span>
                      <span className="text-gray-200 flex-1">{line}</span>
                    </div>
                  ))}
                  {viewIdx === activeFileIdx && !viewFile?.isComplete && (
                    <div className="flex">
                      <span className="inline-block w-8 shrink-0" />
                      <span className="inline-block w-[2px] h-[1.2em] bg-amber-400 animate-pulse" />
                    </div>
                  )}
                  <div ref={codeEndRef} />
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Select a file to view
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
