"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Eye,
  Code2,
  Copy,
  Check,
  FolderOpen,
  FolderTree,
  Loader2,
  Package,
  Play,
  Terminal,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Download,
  FileCode2,
  Globe,
  ArrowLeft,
  ArrowRight,
  Plus,
  Pencil,
  Monitor,
  Smartphone,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FileMap } from "@/lib/parser";
import { useWebContainer, type ContainerStatus } from "@/hooks/useWebContainer";
import type { GenerationProgress } from "@/types";
import { StreamingFileView } from "@/components/StreamingFileView";

// ── Helpers for inline iteration streaming ──

interface StreamingFile {
  path: string;
  content: string;
  isComplete: boolean;
}

function parseStreamingFiles(code: string): StreamingFile[] {
  const files: StreamingFile[] = [];
  const marker = "// --- FILE:";
  const parts = code.split(marker);
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const nl = part.indexOf("\n");
    if (nl === -1) {
      const p = part.replace(/\s*---\s*$/, "").trim();
      if (p) files.push({ path: p, content: "", isComplete: false });
      continue;
    }
    const path = part.slice(0, nl).replace(/\s*---\s*$/, "").trim();
    const content = part.slice(nl + 1);
    files.push({ path, content, isComplete: i < parts.length - 1 });
  }
  return files;
}

type LineStatus = "unchanged" | "added" | "modified";

function computeLineDiff(newContent: string, oldContent: string | undefined): LineStatus[] {
  if (!oldContent) return newContent.split("\n").map(() => "added");
  const newLines = newContent.split("\n");
  const oldLines = oldContent.split("\n");
  return newLines.map((line, i) => {
    if (i >= oldLines.length) return "added";
    if (line !== oldLines[i]) return "modified";
    return "unchanged";
  });
}

interface CodePreviewProps {
  files: FileMap;
  generationKey: number;
  isIOS?: boolean;
  isMobile?: boolean;
  onBuildError?: (error: string) => void;
  onRuntimeError?: (error: string) => void;
  genProgress?: GenerationProgress;
}

const STATUS_CONFIG: Record<ContainerStatus, { label: string; icon: React.ReactNode; color: string }> = {
  idle: { label: "Waiting", icon: <Play className="w-3.5 h-3.5" />, color: "text-muted-foreground" },
  booting: { label: "Starting environment...", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-blue-500" },
  installing: { label: "Installing dependencies...", icon: <Package className="w-3.5 h-3.5 animate-pulse" />, color: "text-amber-500" },
  starting: { label: "Starting dev server...", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-amber-500" },
  ready: { label: "Ready", icon: <Check className="w-3.5 h-3.5" />, color: "text-emerald-500" },
  error: { label: "Error", icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-destructive" },
};

interface FileTreeViewProps {
  files: FileMap;
  selectedFile: string;
  onSelectFile: (path: string) => void;
  streamingMap?: Map<string, StreamingFile>;
  activeStreamingPath?: string | null;
  originalFiles?: FileMap;
}

function FileTreeView({ files, selectedFile, onSelectFile, streamingMap, activeStreamingPath, originalFiles }: FileTreeViewProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["components", "pages", "hooks", "utils", "types", "data", "lib"]));

  const tree = useMemo(() => {
    const dirs: Record<string, { name: string; fullPath: string }[]> = {};
    const rootFiles: { name: string; fullPath: string }[] = [];

    for (const path of Object.keys(files)) {
      const clean = path.startsWith("/") ? path.slice(1) : path;
      const parts = clean.split("/");
      if (parts.length === 1) {
        rootFiles.push({ name: clean, fullPath: path });
      } else {
        const dir = parts[0];
        if (!dirs[dir]) dirs[dir] = [];
        dirs[dir].push({ name: parts.slice(1).join("/"), fullPath: path });
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

  const selectedClean = selectedFile.startsWith("/") ? selectedFile.slice(1) : selectedFile;

  function getFileColor(name: string): string {
    if (name.endsWith(".tsx") || name.endsWith(".jsx")) return "text-blue-400";
    if (name.endsWith(".ts") || name.endsWith(".js")) return "text-yellow-400";
    if (name.endsWith(".css")) return "text-pink-400";
    if (name.endsWith(".json")) return "text-green-400";
    return "text-gray-400";
  }

  function renderFileButton(fullPath: string, displayName: string) {
    const isSelected = selectedClean === fullPath.replace(/^\//, "");
    const sf = streamingMap?.get(fullPath);
    const isStreaming = !!sf;
    const isWritingNow = fullPath === activeStreamingPath;
    const isNewFile = isStreaming && originalFiles && !originalFiles[fullPath];
    const isModFile = isStreaming && originalFiles && !!originalFiles[fullPath];
    const isDone = sf?.isComplete;

    return (
      <button
        key={fullPath}
        onClick={() => onSelectFile(fullPath)}
        className={`flex items-center gap-1.5 w-full px-2 py-[3px] rounded truncate transition-colors duration-150 ${
          isSelected
            ? "bg-white/10 text-gray-100"
            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
        }`}
      >
        {isWritingNow ? (
          <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
        ) : isDone ? (
          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
        ) : (
          <FileCode2 className={`w-3 h-3 shrink-0 ${getFileColor(displayName)}`} />
        )}
        <span className={getFileColor(displayName)}>{displayName}</span>
        {isWritingNow && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        )}
        {isStreaming && !isWritingNow && (
          isNewFile ? (
            <span className="ml-auto flex items-center gap-0.5 text-[9px] font-semibold text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded-full shrink-0">
              <Plus className="w-2.5 h-2.5" />N
            </span>
          ) : isModFile ? (
            <span className="ml-auto flex items-center gap-0.5 text-[9px] font-semibold text-sky-400 bg-sky-400/10 px-1 py-0.5 rounded-full shrink-0">
              <Pencil className="w-2.5 h-2.5" />M
            </span>
          ) : null
        )}
      </button>
    );
  }

  return (
    <div className="p-2 text-xs font-mono space-y-0.5">
      {Object.entries(tree.dirs).map(([dir, children]) => (
        <div key={dir}>
          <button
            onClick={() => toggleDir(dir)}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-gray-400 hover:bg-white/5 hover:text-gray-200"
          >
            {expandedDirs.has(dir) ? (
              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
            )}
            <FolderOpen className="w-4 h-4 shrink-0 text-sky-400" />
            <span className="text-[13px] font-semibold">{dir}</span>
          </button>
          {expandedDirs.has(dir) && (
            <div className="ml-4 space-y-0.5">
              {children.map((child) => renderFileButton(child.fullPath, child.name))}
            </div>
          )}
        </div>
      ))}
      {tree.rootFiles.map((file) => renderFileButton(file.fullPath, file.name))}
    </div>
  );
}

interface IterationDiffViewProps {
  content: string;
  oldContent: string | undefined;
  isStreaming: boolean;
  codeEndRef: React.RefObject<HTMLDivElement | null>;
}

function IterationDiffView({ content, oldContent, isStreaming, codeEndRef }: IterationDiffViewProps) {
  const lines = content.split("\n");
  const lineStatuses = useMemo(
    () => computeLineDiff(content, oldContent),
    [content, oldContent]
  );
  const hasOld = oldContent !== undefined;

  return (
    <pre className="p-4 text-[13px] font-mono leading-relaxed whitespace-pre-wrap">
      {lines.map((line, i) => {
        const status = lineStatuses[i] ?? "unchanged";
        const isChanged = hasOld && status !== "unchanged";

        let bgClass = "";
        let gutterClass = "";
        let gutterChar = " ";

        if (isChanged) {
          if (status === "added") {
            bgClass = "bg-emerald-500/8";
            gutterClass = "text-emerald-500";
            gutterChar = "+";
          } else if (status === "modified") {
            bgClass = "bg-sky-500/8";
            gutterClass = "text-sky-500";
            gutterChar = "~";
          }
        }

        return (
          <div key={i} className={`flex ${bgClass}`}>
            {hasOld && (
              <span className={`inline-block w-4 shrink-0 text-center text-[11px] leading-relaxed select-none ${gutterClass}`}>
                {gutterChar}
              </span>
            )}
            <span className="inline-block w-8 shrink-0 text-right pr-4 text-gray-600 select-none text-[11px] leading-relaxed">
              {i + 1}
            </span>
            <span className={`flex-1 ${isChanged ? (status === "added" ? "text-emerald-300" : "text-sky-200") : "text-gray-200"}`}>
              {line}
            </span>
          </div>
        );
      })}
      {isStreaming && (
        <div className="flex">
          {hasOld && <span className="inline-block w-4 shrink-0" />}
          <span className="inline-block w-8 shrink-0" />
          <span className="inline-block w-[2px] h-[1.2em] bg-amber-400 animate-pulse" />
        </div>
      )}
      <div ref={codeEndRef} />
    </pre>
  );
}

export function CodePreview({ files, generationKey, isIOS = false, isMobile = false, onBuildError, onRuntimeError, genProgress }: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "logs">("preview");
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>("/App.tsx");
  const [fileTreeOpen, setFileTreeOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframePath, setIframePath] = useState("/");
  const [urlInput, setUrlInput] = useState("/");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const { status, previewUrl, error, logs, lastBuildError, lastRuntimeError, clearBuildError, clearRuntimeError, mountFiles, restartContainer } = useWebContainer();
  const [mobileWidth, setMobileWidth] = useState(375);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(375);
  const MOBILE_MIN_WIDTH = 280;
  const MOBILE_MAX_WIDTH = 768;
  const prevGenKeyRef = useRef<number>(-1);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const reportedErrorRef = useRef<string | null>(null);
  const prevPhaseRef = useRef<string | null>(null);
  const userPickedFileRef = useRef(false);
  const streamingCodeEndRef = useRef<HTMLDivElement>(null);
  const iframeLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleRestartContainer() {
    restartContainer(files);
  }

  function handleMobileDragStart(e: React.PointerEvent) {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = mobileWidth;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleMobileDragMove(e: React.PointerEvent) {
    if (!isDraggingRef.current) return;
    const delta = e.clientX - dragStartXRef.current;
    const newWidth = Math.round(
      Math.max(MOBILE_MIN_WIDTH, Math.min(MOBILE_MAX_WIDTH, dragStartWidthRef.current + delta * 2))
    );
    setMobileWidth(newWidth);
  }

  function handleMobileDragEnd() {
    isDraggingRef.current = false;
  }

  const displayFiles = files;

  // ── Inline iteration streaming state ──
  const isWritingCode = !!(genProgress?.phase && (genProgress.phase === "writing" || genProgress.phase === "writing-files") && genProgress.streamingCode);
  const hasExistingFiles = Object.keys(files).length > 0;
  const isIterationStreaming = isWritingCode && hasExistingFiles;
  const isFirstGenStreaming = isWritingCode && !hasExistingFiles;

  // Parse streaming files for iteration mode
  const streamingFiles = useMemo(() => {
    if (!isIterationStreaming || !genProgress?.streamingCode) return [];
    return parseStreamingFiles(genProgress.streamingCode);
  }, [isIterationStreaming, genProgress?.streamingCode]);

  // Map path -> StreamingFile for quick lookup
  const streamingMap = useMemo(() => {
    const m = new Map<string, StreamingFile>();
    for (const f of streamingFiles) m.set(f.path, f);
    return m;
  }, [streamingFiles]);

  // The file currently being written (last incomplete file)
  const activeStreamingPath = useMemo(() => {
    if (streamingFiles.length === 0) return null;
    const last = streamingFiles[streamingFiles.length - 1];
    return last.isComplete ? null : last.path;
  }, [streamingFiles]);

  // Merged file map for the tree: existing files + any NEW streaming files not yet in displayFiles
  const mergedTreeFiles = useMemo(() => {
    if (!isIterationStreaming) return displayFiles;
    const merged = { ...displayFiles };
    for (const sf of streamingFiles) {
      if (!merged[sf.path]) {
        merged[sf.path] = ""; // placeholder — content comes from streaming
      }
    }
    return merged;
  }, [displayFiles, streamingFiles, isIterationStreaming]);

  // Auto-select the file being written during iteration (unless user picked manually)
  useEffect(() => {
    if (!isIterationStreaming) {
      userPickedFileRef.current = false;
      return;
    }
    if (userPickedFileRef.current) return;
    if (streamingFiles.length > 0) {
      const last = streamingFiles[streamingFiles.length - 1];
      setSelectedFile(last.path);
    }
  }, [isIterationStreaming, streamingFiles]);

  // Auto-scroll code to bottom when streaming the active file
  useEffect(() => {
    if (isIterationStreaming && activeStreamingPath === selectedFile) {
      streamingCodeEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isIterationStreaming, activeStreamingPath, selectedFile, genProgress?.streamingCode]);

  // Auto-switch to code tab when code starts streaming
  useEffect(() => {
    const phase = genProgress?.phase ?? null;
    const prevPhase = prevPhaseRef.current;

    // Entering a code-writing phase → switch to code tab
    if (
      (phase === "writing" || phase === "writing-files") &&
      prevPhase !== "writing" &&
      prevPhase !== "writing-files"
    ) {
      setActiveTab("code");
    }

    // Phase ended (went to null) and we were writing → switch to preview
    if (
      phase === null &&
      (prevPhase === "writing" || prevPhase === "writing-files" || prevPhase === "mounting")
    ) {
      setActiveTab("preview");
    }

    prevPhaseRef.current = phase;
  }, [genProgress?.phase]);

  // Fire onBuildError callback when a new build error is detected
  useEffect(() => {
    if (lastBuildError && lastBuildError !== reportedErrorRef.current && onBuildError) {
      reportedErrorRef.current = lastBuildError;
      onBuildError(lastBuildError);
      clearBuildError();
    }
  }, [lastBuildError, onBuildError, clearBuildError]);

  // Fire onRuntimeError callback when a new runtime error is detected
  useEffect(() => {
    if (lastRuntimeError && onRuntimeError) {
      onRuntimeError(lastRuntimeError);
      clearRuntimeError();
    }
  }, [lastRuntimeError, onRuntimeError, clearRuntimeError]);

  const fileCount = Object.keys(displayFiles).length;
  const isMultiFile = fileCount > 1;
  const statusConfig = STATUS_CONFIG[status];

  // Reset iframeLoaded when URL changes
  useEffect(() => {
    setIframeLoaded(false);
    setIframePath("/");
    setUrlInput("/");
  }, [previewUrl]);

  // Listen for messages from the iframe (navigation tracking + content ready)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data) return;

      // Navigation tracking
      if (e.data.type === "dokiflux-navigation" && typeof e.data.path === "string") {
        const path = e.data.path;
        setIframePath(path);
        setUrlInput(path);
      }

      // Content ready — React has painted inside the WebContainer iframe
      if (e.data.type === "dokiflux-content-ready") {
        if (iframeLoadTimeoutRef.current) {
          clearTimeout(iframeLoadTimeoutRef.current);
          iframeLoadTimeoutRef.current = null;
        }
        setIframeLoaded(true);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Mount files when generationKey changes
  useEffect(() => {
    if (generationKey !== prevGenKeyRef.current && Object.keys(files).length > 0) {
      prevGenKeyRef.current = generationKey;
      mountFiles(files);
    }
  }, [generationKey, files, mountFiles]);

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
      setIframeLoaded(false);
      iframeRef.current.src = previewUrl + iframePath;
    }
  }

  function handleNavigate(path: string) {
    if (!iframeRef.current || !previewUrl) return;
    const cleanPath = path.startsWith("/") ? path : "/" + path;
    try {
      iframeRef.current.contentWindow?.postMessage(
        { type: "dokiflux-navigate", path: cleanPath },
        "*"
      );
    } catch {
      // Fallback: full reload if postMessage fails
      setIframeLoaded(false);
      iframeRef.current.src = previewUrl + cleanPath;
    }
    setIframePath(cleanPath);
    setUrlInput(cleanPath);
  }

  function handleGoBack() {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch { /* ignore */ }
  }

  function handleGoForward() {
    try {
      iframeRef.current?.contentWindow?.history.forward();
    } catch { /* ignore */ }
  }

  const handleIframeLoad = useCallback(() => {
    // Fallback: reveal preview after 35s if dokiflux-content-ready never arrives.
    // Normally the content-ready postMessage from MAIN_TSX fires much sooner.
    if (iframeLoadTimeoutRef.current) {
      clearTimeout(iframeLoadTimeoutRef.current);
    }
    iframeLoadTimeoutRef.current = setTimeout(() => {
      setIframeLoaded(true);
      iframeLoadTimeoutRef.current = null;
    }, 35000);
  }, []);

  async function handleDownloadProject() {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();

    for (const [path, content] of Object.entries(displayFiles)) {
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      zip.file(`src/${cleanPath}`, content);
    }

    // Add scaffold files
    zip.file("package.json", JSON.stringify({
      name: "dokiflux-project",
      private: true,
      type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: { react: "^18.3.1", "react-dom": "^18.3.1", "lucide-react": "^0.460.0", "react-router-dom": "^7.1.1" },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.4", vite: "^6.0.0",
        "@types/react": "^18.3.0", "@types/react-dom": "^18.3.0",
        typescript: "^5.6.0", tailwindcss: "^3.4.17",
        postcss: "^8.4.49", autoprefixer: "^10.4.20",
      },
    }, null, 2));
    zip.file("vite.config.ts", 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()],\n});\n');
    zip.file("tailwind.config.js", '/** @type {import(\'tailwindcss\').Config} */\nexport default {\n  content: ["./**/*.{js,ts,jsx,tsx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\n');
    zip.file("postcss.config.js", 'export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n');
    zip.file("index.html", '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Dokiflux Project</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n');
    zip.file("src/main.tsx", 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport { BrowserRouter } from "react-router-dom";\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <BrowserRouter>\n      <App />\n    </BrowserRouter>\n  </React.StrictMode>\n);\n');
    zip.file("src/index.css", '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
    zip.file("tsconfig.json", JSON.stringify({
      compilerOptions: {
        target: "ES2020", useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"], module: "ESNext",
        skipLibCheck: true, moduleResolution: "bundler",
        allowImportingTsExtensions: true, isolatedModules: true,
        moduleDetection: "force", noEmit: true, jsx: "react-jsx",
        strict: true, allowJs: true,
      },
      include: ["src"],
    }, null, 2));
    zip.file("README.md", '# Dokiflux Project\n\nGenerated with [Dokiflux](https://github.com/jaume768/DokiFlux).\n\n## Getting Started\n\n```bash\nnpm install\nnpm run dev\n```\n');

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dokiflux-project.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  const effectiveFileList = Object.keys(isIterationStreaming ? mergedTreeFiles : displayFiles);
  if (!effectiveFileList.includes(selectedFile) && effectiveFileList.length > 0) {
    setSelectedFile(effectiveFileList.find((f) => f.includes("App")) || effectiveFileList[0]);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b bg-background gap-1 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 overflow-x-auto">
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <Button
              variant={activeTab === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("preview")}
              className="gap-1 sm:gap-1.5 text-xs px-2 sm:px-3"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              variant={activeTab === "code" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("code")}
              className="gap-1 sm:gap-1.5 text-xs px-2 sm:px-3"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Code</span>
            </Button>
            <Button
              variant={activeTab === "logs" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("logs")}
              className="gap-1 sm:gap-1.5 text-xs px-2 sm:px-3"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logs</span>
            </Button>
          </div>

          {isMultiFile && (
            <Badge variant="secondary" className="gap-1 text-xs font-mono shrink-0">
              <FolderTree className="w-3 h-3" />
              {fileCount}
            </Badge>
          )}

          {/* Status indicator */}
          <div className={`flex items-center gap-1 sm:gap-1.5 text-xs shrink-0 ${statusConfig.color}`}>
            {statusConfig.icon}
            <span className="hidden sm:inline">{statusConfig.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {activeTab === "code" && (
            <Button variant="ghost" size="sm" onClick={handleCopyAll} className="gap-1 sm:gap-1.5 text-xs px-2 sm:px-3">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy all"}</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleDownloadProject} className="gap-1 sm:gap-1.5 text-xs px-2 sm:px-3">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          {status !== "idle" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestartContainer}
              title="Restart WebContainer"
              className="gap-1 sm:gap-1.5 text-xs px-2 sm:px-3"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restart</span>
            </Button>
          )}
          {activeTab === "preview" && (
            <div className="flex items-center bg-muted rounded-md p-0.5 ml-1">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`p-1.5 rounded transition-colors ${
                  previewMode === "desktop"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Desktop view"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`p-1.5 rounded transition-colors ${
                  previewMode === "mobile"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Mobile view"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
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
            <div className="relative w-full h-full flex flex-col">
              {/* URL Bar */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b bg-muted/40 shrink-0">
                <button onClick={handleGoBack} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleGoForward} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition">
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleRefresh} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex items-center gap-1.5 bg-background border rounded-md px-2.5 py-1">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNavigate(urlInput);
                    }}
                    className="flex-1 text-xs font-mono bg-transparent outline-none text-foreground"
                    spellCheck={false}
                  />
                </div>
              </div>
              {/* Iframe */}
              <div className={`relative flex-1 min-h-0 ${
                previewMode === "mobile" ? "flex flex-col items-center bg-zinc-950/80 overflow-auto" : ""
              }`}>
                {!iframeLoaded && (
                  <div className={`flex flex-col items-center justify-center bg-background z-10 gap-3 ${
                    previewMode === "mobile"
                      ? "absolute inset-0 rounded-[2rem]"
                      : "absolute inset-0"
                  }`}>
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading preview...</p>
                  </div>
                )}
                {previewMode === "mobile" ? (
                  <div className="flex flex-col items-center py-4 min-h-full w-full">
                    {/* Size controls */}
                    <div className="flex items-center gap-2 mb-3 shrink-0">
                      {[280, 375, 414, 768].map((w) => (
                        <button
                          key={w}
                          onClick={() => setMobileWidth(w)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                            mobileWidth === w
                              ? "bg-primary text-primary-foreground"
                              : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                      <span className="text-[11px] font-mono text-zinc-500">
                        {mobileWidth} × {Math.round(mobileWidth * (16 / 9))}
                      </span>
                    </div>
                    {/* Phone frame + drag handle */}
                    <div className="flex items-stretch shrink-0">
                      <div
                        className="relative shrink-0 rounded-[2.5rem] border-[6px] border-zinc-700 bg-black shadow-2xl shadow-black/50 overflow-hidden"
                        style={{ width: mobileWidth, height: Math.round(mobileWidth * (16 / 9)) }}
                      >
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-2xl z-20" />
                        <iframe
                          ref={iframeRef}
                          src={previewUrl}
                          className="w-full h-full border-0"
                          title="Preview"
                          allow="cross-origin-isolated"
                          onLoad={handleIframeLoad}
                        />
                      </div>
                      {/* Drag handle */}
                      <div
                        className="w-4 flex items-center justify-center cursor-ew-resize select-none group ml-1"
                        onPointerDown={handleMobileDragStart}
                        onPointerMove={handleMobileDragMove}
                        onPointerUp={handleMobileDragEnd}
                        onPointerCancel={handleMobileDragEnd}
                      >
                        <div className="w-1 h-12 rounded-full bg-zinc-600 group-hover:bg-zinc-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    title="Preview"
                    allow="cross-origin-isolated"
                    onLoad={handleIframeLoad}
                  />
                )}
              </div>
            </div>
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
                  <p className="text-sm text-center px-4">Generate a component to see the preview</p>
                  {isIOS && (
                    <div className="mt-4 mx-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center max-w-sm">
                      <p className="text-xs text-amber-600 font-medium">⚠️ iOS Limitation</p>
                      <p className="text-xs text-amber-600/80 mt-1">
                        Live preview is not supported on iOS Safari. You can still view and copy the generated code.
                      </p>
                    </div>
                  )}
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
          className="absolute inset-0 flex flex-col overflow-hidden"
          style={{
            visibility: activeTab === "code" ? "visible" : "hidden",
            pointerEvents: activeTab === "code" ? "auto" : "none",
          }}
        >
          {/* Iteration streaming status bar */}
          {isIterationStreaming && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/50 shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span className="text-xs font-medium text-amber-500">
                Updating · {streamingFiles.length} file{streamingFiles.length !== 1 ? "s" : ""}...
              </span>
              {streamingFiles.filter(f => !displayFiles[f.path]).length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                  <Plus className="w-2.5 h-2.5" />
                  {streamingFiles.filter(f => !displayFiles[f.path]).length} new
                </span>
              )}
              {streamingFiles.filter(f => !!displayFiles[f.path]).length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded-full">
                  <Pencil className="w-2.5 h-2.5" />
                  {streamingFiles.filter(f => !!displayFiles[f.path]).length} modified
                </span>
              )}
              <span className="text-[11px] text-muted-foreground ml-auto">
                {((genProgress?.charsReceived ?? 0) / 1000).toFixed(1)}k chars
              </span>
            </div>
          )}

          {/* Empty state — no files yet and not streaming */}
          {!isFirstGenStreaming && !isIterationStreaming && Object.keys(displayFiles).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Code2 className="w-10 h-10 opacity-30" />
              <p className="text-sm text-center px-4">Genera un componente para ver el código aquí</p>
            </div>
          ) : isFirstGenStreaming && genProgress?.streamingCode ? (
            <StreamingFileView
              streamingCode={genProgress.streamingCode}
              filesDetected={genProgress.filesDetected}
              charsReceived={genProgress.charsReceived}
              existingFiles={{}}
            />
          ) : (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* File tree sidebar – desktop: always visible, mobile: overlay */}
              {(isMultiFile || isIterationStreaming) && (
                <>
                  {/* Desktop sidebar — only rendered when not on mobile */}
                  {!isMobile && (
                    <div className="w-48 shrink-0 border-r border-white/10 bg-[#181825] overflow-auto">
                      <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                        Explorer
                      </div>
                      <FileTreeView
                        files={isIterationStreaming ? mergedTreeFiles : displayFiles}
                        selectedFile={selectedFile}
                        onSelectFile={(path) => {
                          if (isIterationStreaming) userPickedFileRef.current = true;
                          setSelectedFile(path);
                        }}
                        streamingMap={isIterationStreaming ? streamingMap : undefined}
                        activeStreamingPath={isIterationStreaming ? activeStreamingPath : undefined}
                        originalFiles={isIterationStreaming ? displayFiles : undefined}
                      />
                    </div>
                  )}
                  {/* Mobile overlay — rendered as absolute overlay when fileTreeOpen */}
                  {isMobile && fileTreeOpen && (
                    <div className="absolute inset-0 z-20 bg-[#181825] flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
                        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Explorer</span>
                        <button
                          onClick={() => setFileTreeOpen(false)}
                          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-auto">
                        <FileTreeView
                          files={isIterationStreaming ? mergedTreeFiles : displayFiles}
                          selectedFile={selectedFile}
                          onSelectFile={(path) => {
                            if (isIterationStreaming) userPickedFileRef.current = true;
                            setSelectedFile(path);
                            setFileTreeOpen(false);
                          }}
                          streamingMap={isIterationStreaming ? streamingMap : undefined}
                          activeStreamingPath={isIterationStreaming ? activeStreamingPath : undefined}
                          originalFiles={isIterationStreaming ? displayFiles : undefined}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e2e]">
                {/* File tab bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-[#252536] shrink-0">
                  {isMobile && (isMultiFile || isIterationStreaming) && (
                    <button
                      onClick={() => setFileTreeOpen((v) => !v)}
                      className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors shrink-0"
                      title="Toggle file explorer"
                    >
                      <FolderTree className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isIterationStreaming && activeStreamingPath === selectedFile ? (
                    <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-amber-400" />
                  ) : (
                    <FileCode2 className={`w-3.5 h-3.5 shrink-0 ${
                      selectedFile.endsWith(".tsx") || selectedFile.endsWith(".jsx") ? "text-blue-400" :
                      selectedFile.endsWith(".ts") || selectedFile.endsWith(".js") ? "text-yellow-400" :
                      selectedFile.endsWith(".css") ? "text-pink-400" :
                      selectedFile.endsWith(".json") ? "text-green-400" : "text-gray-400"
                    }`} />
                  )}
                  <span className="text-xs font-mono text-gray-300 truncate">
                    {selectedFile.startsWith("/") ? selectedFile.slice(1) : selectedFile}
                  </span>
                  {isIterationStreaming && streamingMap.has(selectedFile) && (
                    displayFiles[selectedFile] ? (
                      <span className="text-[9px] font-medium text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded-full">
                        Modified
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                        New file
                      </span>
                    )
                  )}
                  {isIterationStreaming && activeStreamingPath === selectedFile && (
                    <span className="flex items-center gap-1 ml-auto text-[10px] text-amber-400 shrink-0">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      writing...
                    </span>
                  )}
                  {isIterationStreaming && streamingMap.get(selectedFile)?.isComplete && (
                    <span className="flex items-center gap-1 ml-auto text-[10px] text-emerald-400 shrink-0">
                      <Check className="w-3 h-3" />
                      done
                    </span>
                  )}
                </div>
                {/* Code content — streaming diff or static */}
                <div className="flex-1 overflow-auto">
                  {isIterationStreaming && streamingMap.has(selectedFile) ? (
                    <IterationDiffView
                      content={streamingMap.get(selectedFile)!.content}
                      oldContent={displayFiles[selectedFile]}
                      isStreaming={activeStreamingPath === selectedFile}
                      codeEndRef={streamingCodeEndRef}
                    />
                  ) : (
                    <pre className="p-4 text-[13px] font-mono leading-relaxed whitespace-pre-wrap">
                      {(displayFiles[selectedFile] || "// Select a file").split("\n").map((line, i) => (
                        <div key={i} className="flex">
                          <span className="inline-block w-8 shrink-0 text-right pr-4 text-gray-600 select-none text-[11px] leading-relaxed">
                            {i + 1}
                          </span>
                          <span className="text-gray-200 flex-1">{line}</span>
                        </div>
                      ))}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
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