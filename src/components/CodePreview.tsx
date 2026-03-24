"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  Download,
  FileCode2,
  Globe,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FileMap } from "@/lib/parser";
import { useWebContainer, type ContainerStatus } from "@/hooks/useWebContainer";
import type { GenerationProgress } from "@/types";
import { StreamingFileView } from "@/components/StreamingFileView";

interface CodePreviewProps {
  files: FileMap;
  generationKey: number;
  isIOS?: boolean;
  onBuildError?: (error: string) => void;
  genProgress?: GenerationProgress;
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

function FileTreeView({ files, selectedFile, onSelectFile }: { files: FileMap; selectedFile: string; onSelectFile: (path: string) => void }) {
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
                <button
                  key={child.fullPath}
                  onClick={() => onSelectFile(child.fullPath)}
                  className={`flex items-center gap-1.5 w-full px-2 py-1 rounded truncate transition ${
                    selectedClean === child.fullPath.replace(/^\//, "")
                      ? "bg-primary/10 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <FileCode2 className="w-3 h-3 shrink-0 opacity-50" />
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {tree.rootFiles.map((file) => (
        <button
          key={file.fullPath}
          onClick={() => onSelectFile(file.fullPath)}
          className={`flex items-center gap-1.5 w-full px-2 py-1 rounded truncate transition ${
            selectedClean === file.name
              ? "bg-primary/10 text-foreground font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileCode2 className="w-3 h-3 shrink-0 opacity-50" />
          {file.name}
        </button>
      ))}
    </div>
  );
}

export function CodePreview({ files, generationKey, isIOS = false, onBuildError, genProgress }: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "logs">("preview");
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>("/App.tsx");
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframePath, setIframePath] = useState("/");
  const [urlInput, setUrlInput] = useState("/");
  const { status, previewUrl, error, logs, lastBuildError, clearBuildError, mountFiles } = useWebContainer();
  const prevGenKeyRef = useRef<number>(-1);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const reportedErrorRef = useRef<string | null>(null);
  const prevPhaseRef = useRef<string | null>(null);

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

  const displayFiles = useMemo(() => {
    return Object.keys(files).length > 0 ? files : DEFAULT_FILES;
  }, [files]);

  const fileCount = Object.keys(displayFiles).length;
  const isMultiFile = fileCount > 1;
  const statusConfig = STATUS_CONFIG[status];

  // Reset iframeLoaded when URL changes
  useEffect(() => {
    setIframeLoaded(false);
    setIframePath("/");
    setUrlInput("/");
  }, [previewUrl]);

  // Listen for navigation messages from the iframe (postMessage bridge)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data && e.data.type === "dokiflux-navigation" && typeof e.data.path === "string") {
        const path = e.data.path;
        setIframePath(path);
        setUrlInput(path);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
    setIframeLoaded(true);
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

  const fileList = Object.keys(displayFiles);
  if (!fileList.includes(selectedFile) && fileList.length > 0) {
    setSelectedFile(fileList.find((f) => f.includes("App")) || fileList[0]);
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
              <div className="relative flex-1 min-h-0">
                {!iframeLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading preview...</p>
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  title="Preview"
                  allow="cross-origin-isolated"
                  onLoad={handleIframeLoad}
                />
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
          className="absolute inset-0 flex overflow-hidden"
          style={{
            visibility: activeTab === "code" ? "visible" : "hidden",
            pointerEvents: activeTab === "code" ? "auto" : "none",
          }}
        >
          {isMultiFile && (
            <div className="hidden md:block w-48 shrink-0 border-r overflow-auto bg-muted/30">
              <FileTreeView files={displayFiles} selectedFile={selectedFile} onSelectFile={setSelectedFile} />
            </div>
          )}
          {/* Show streaming file view when generating code, otherwise show normal file tabs + content */}
          {genProgress?.phase && (genProgress.phase === "writing" || genProgress.phase === "writing-files") && genProgress.streamingCode ? (
            <StreamingFileView
              streamingCode={genProgress.streamingCode}
              filesDetected={genProgress.filesDetected}
              charsReceived={genProgress.charsReceived}
            />
          ) : (
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