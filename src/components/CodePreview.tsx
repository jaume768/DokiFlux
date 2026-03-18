"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Eye,
  Code2,
  Copy,
  Check,
  FolderTree,
  Loader2,
  Package,
  Play,
  Terminal,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FileMap } from "@/lib/parser";
import { useWebContainer, type ContainerStatus } from "@/hooks/useWebContainer";

interface CodePreviewProps {
  files: FileMap;
  generationKey: number;
}

const DEFAULT_FILES: FileMap = {
  "/App.tsx": `export default function Welcome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center text-white max-w-md">
        <h1 className="text-4xl font-bold mb-4">Dokiflux</h1>
        <p className="text-lg opacity-90">
          Describe a UI component in the chat and watch it come to life.
        </p>
      </div>
    </div>
  );
}`,
};

const STATUS_CONFIG: Record<ContainerStatus, { label: string; icon: React.ReactNode; color: string }> = {
  idle: { label: "Waiting", icon: <Play className="w-3.5 h-3.5" />, color: "text-muted-foreground" },
  booting: { label: "Starting environment...", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-blue-500" },
  installing: { label: "Installing dependencies...", icon: <Package className="w-3.5 h-3.5 animate-pulse" />, color: "text-amber-500" },
  starting: { label: "Starting dev server...", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-amber-500" },
  ready: { label: "Ready", icon: <Check className="w-3.5 h-3.5" />, color: "text-emerald-500" },
  error: { label: "Error", icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-destructive" },
};

function FileTreeView({ files }: { files: FileMap }) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["components"]));

  const tree = useMemo(() => {
    const dirs: Record<string, string[]> = {};
    const rootFiles: string[] = [];

    for (const path of Object.keys(files)) {
      const clean = path.startsWith("/") ? path.slice(1) : path;
      const parts = clean.split("/");
      if (parts.length === 1) {
        rootFiles.push(clean);
      } else {
        const dir = parts[0];
        if (!dirs[dir]) dirs[dir] = [];
        dirs[dir].push(parts.slice(1).join("/"));
      }
    }
    return { dirs, rootFiles };
  }, [files]);

  function toggleDir(dir: string) {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  }

  return (
    <div className="p-2 text-xs font-mono space-y-0.5">
      {Object.entries(tree.dirs).map(([dir, children]) => (
        <div key={dir}>
          <button
            onClick={() => toggleDir(dir)}
            className="flex items-center gap-1 w-full px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {expandedDirs.has(dir) ? (
              <ChevronDown className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 shrink-0" />
            )}
            <span>{dir}/</span>
          </button>
          {expandedDirs.has(dir) && (
            <div className="ml-4 space-y-0.5">
              {children.map((child) => (
                <div key={child} className="px-2 py-1 text-muted-foreground truncate">
                  {child}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {tree.rootFiles.map((file) => (
        <div key={file} className="px-2 py-1 text-muted-foreground truncate">
          {file}
        </div>
      ))}
    </div>
  );
}

export function CodePreview({ files, generationKey }: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "logs">("preview");
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>("/App.tsx");
  const { status, previewUrl, error, logs, mountFiles } = useWebContainer();
  const prevGenKeyRef = useRef<number>(-1);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const displayFiles = useMemo(() => {
    return Object.keys(files).length > 0 ? files : DEFAULT_FILES;
  }, [files]);

  const fileCount = Object.keys(displayFiles).length;
  const isMultiFile = fileCount > 1;
  const statusConfig = STATUS_CONFIG[status];

  // Mount files when generationKey changes
  useEffect(() => {
    if (generationKey !== prevGenKeyRef.current && Object.keys(displayFiles).length > 0) {
      prevGenKeyRef.current = generationKey;
      mountFiles(displayFiles);
    }
  }, [generationKey, displayFiles, mountFiles]);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === "logs") {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  function handleCopyAll() {
    const allCode = Object.entries(displayFiles)
      .map(([path, content]) => `// --- FILE: ${path} ---\n${content}`)
      .join("\n\n");
    navigator.clipboard.writeText(allCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRefresh() {
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = previewUrl;
    }
  }

  const fileList = Object.keys(displayFiles);
  if (!fileList.includes(selectedFile) && fileList.length > 0) {
    setSelectedFile(fileList.find((f) => f.includes("App")) || fileList[0]);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant={activeTab === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("preview")}
              className="gap-1.5 text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </Button>
            <Button
              variant={activeTab === "code" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("code")}
              className="gap-1.5 text-xs"
            >
              <Code2 className="w-3.5 h-3.5" />
              Code
            </Button>
            <Button
              variant={activeTab === "logs" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("logs")}
              className="gap-1.5 text-xs"
            >
              <Terminal className="w-3.5 h-3.5" />
              Logs
            </Button>
          </div>

          {isMultiFile && (
            <Badge variant="secondary" className="gap-1 text-xs font-mono">
              <FolderTree className="w-3 h-3" />
              {fileCount} files
            </Badge>
          )}

          {/* Status indicator */}
          <div className={`flex items-center gap-1.5 text-xs ${statusConfig.color}`}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {activeTab === "preview" && previewUrl && (
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
          {activeTab === "code" && (
            <Button variant="ghost" size="sm" onClick={handleCopyAll} className="gap-1.5 text-xs">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy all"}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Preview Tab */}
        <div
          className="absolute inset-0"
          style={{
            visibility: activeTab === "preview" ? "visible" : "hidden",
            pointerEvents: activeTab === "preview" ? "auto" : "none",
          }}
        >
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0 bg-white"
              title="Preview"
              allow="cross-origin-isolated"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              {status === "error" ? (
                <>
                  <AlertCircle className="w-10 h-10 text-destructive" />
                  <p className="text-sm font-medium text-destructive">Failed to start preview</p>
                  <p className="text-xs max-w-md text-center">{error}</p>
                </>
              ) : status === "idle" ? (
                <>
                  <Eye className="w-10 h-10 opacity-30" />
                  <p className="text-sm">Generate a component to see the preview</p>
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 animate-spin opacity-50" />
                  <p className="text-sm">{statusConfig.label}</p>
                  <p className="text-xs opacity-60">This may take a few seconds on first run...</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Code Tab */}
        <div
          className="absolute inset-0 flex overflow-hidden"
          style={{
            visibility: activeTab === "code" ? "visible" : "hidden",
            pointerEvents: activeTab === "code" ? "auto" : "none",
          }}
        >
          {isMultiFile && (
            <div className="w-48 shrink-0 border-r overflow-auto bg-muted/30">
              <FileTreeView files={displayFiles} />
            </div>
          )}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isMultiFile && (
              <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/50 overflow-x-auto">
                {fileList.map((path) => (
                  <button
                    key={path}
                    onClick={() => setSelectedFile(path)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md whitespace-nowrap transition ${
                      selectedFile === path
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  >
                    {path.split("/").pop()}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-auto">
              <pre className="p-4 text-sm font-mono leading-relaxed text-foreground">
                <code>{displayFiles[selectedFile] || "// Select a file"}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Logs Tab */}
        <div
          className="absolute inset-0 overflow-auto bg-[#1e1e2e] p-4"
          style={{
            visibility: activeTab === "logs" ? "visible" : "hidden",
            pointerEvents: activeTab === "logs" ? "auto" : "none",
          }}
        >
          <pre className="text-xs font-mono text-green-400 leading-relaxed whitespace-pre-wrap">
            {logs.length > 0 ? logs.join("\n") : "No logs yet. Generate a component to see output."}
          </pre>
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}