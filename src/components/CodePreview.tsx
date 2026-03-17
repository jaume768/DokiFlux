"use client";

import { useState, useMemo, useEffect } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackFileExplorer,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { dracula } from "@codesandbox/sandpack-themes";
import { Eye, Code2, Copy, Check, FolderTree, AlertTriangle, Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FileMap } from "@/lib/parser";

function ErrorOverlay({ hasUserCode }: { hasUserCode: boolean }) {
  const { sandpack, listen } = useSandpack();
  const [bundlerDone, setBundlerDone] = useState(false);
  const [stuckSeconds, setStuckSeconds] = useState(0);

  useEffect(() => {
    setBundlerDone(false);
    setStuckSeconds(0);

    const unsub = listen((msg) => {
      if (msg.type === "done") {
        setBundlerDone(true);
      }
    });

    return unsub;
  }, [listen]);

  useEffect(() => {
    if (bundlerDone || !hasUserCode) {
      return;
    }

    const timer = setInterval(() => {
      setStuckSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [bundlerDone, hasUserCode]);

  if (sandpack.error) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col bg-[#1e1e2e] text-white overflow-auto">
        <div className="flex items-center gap-3 border-b border-red-500/30 bg-red-500/10 px-5 py-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <span className="text-sm font-semibold text-red-300">Error de compilación</span>
        </div>
        <div className="flex-1 p-5 overflow-auto">
          <pre className="text-sm font-mono text-red-200 whitespace-pre-wrap break-words leading-relaxed">
            {sandpack.error.message}
          </pre>
        </div>
        <div className="border-t border-white/10 px-5 py-3">
          <p className="text-xs text-white/50">
            Envía un nuevo prompt para corregir el error.
          </p>
        </div>
      </div>
    );
  }

  if (hasUserCode && !bundlerDone && stuckSeconds > 15) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col bg-[#1e1e2e] text-white overflow-auto">
        <div className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-5 py-3">
          <Terminal className="h-5 w-5 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-amber-300">Preview no disponible</span>
        </div>
        <div className="flex-1 p-5 overflow-auto">
          <p className="text-sm text-amber-200 leading-relaxed">
            El sandbox lleva más de {stuckSeconds}s intentando compilar el proyecto.
            Es probable que haya un error en el código generado que impide la compilación.
          </p>
          <p className="text-sm text-white/60 mt-4">
            Posibles causas:
          </p>
          <ul className="text-sm text-white/60 mt-2 space-y-1 list-disc list-inside">
            <li>Error de importación entre archivos</li>
            <li>Resolución de módulos fallida</li>
            <li>Error de sintaxis en el código generado</li>
          </ul>
          <p className="text-sm text-white/60 mt-4">
            Revisa el código en la pestaña &quot;Code&quot; o envía un nuevo prompt.
          </p>
        </div>
      </div>
    );
  }

  if (hasUserCode && !bundlerDone && stuckSeconds > 5) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1e1e2e]/80">
        <div className="flex flex-col items-center gap-3 text-white/70">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Compilando proyecto... ({stuckSeconds}s)</p>
        </div>
      </div>
    );
  }

  return null;
}

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

export function CodePreview({ files, generationKey }: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const displayFiles = useMemo(() => {
    const f = Object.keys(files).length > 0 ? files : DEFAULT_FILES;
    const sandpackFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(f)) {
      sandpackFiles[path] = content;
    }
    return sandpackFiles;
  }, [files]);

  const fileCount = Object.keys(displayFiles).length;
  const isMultiFile = fileCount > 1;

  function handleCopyAll() {
    const allCode = Object.entries(displayFiles)
      .map(([path, content]) => `// --- FILE: ${path} ---\n${content}`)
      .join("\n\n");
    navigator.clipboard.writeText(allCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full">
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
          </div>
          {isMultiFile && (
            <Badge variant="secondary" className="gap-1 text-xs font-mono">
              <FolderTree className="w-3 h-3" />
              {fileCount} files
            </Badge>
          )}
        </div>
        {activeTab === "code" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyAll}
            className="gap-1.5 text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy all"}
          </Button>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        <SandpackProvider
          key={generationKey}
          template="react-ts"
          theme={dracula}
          files={displayFiles}
          customSetup={{
            dependencies: {
              "lucide-react": "latest",
            },
          }}
          options={{
            activeFile: "/App.tsx",
            externalResources: [
              "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
            ],
          }}
        >
          <ErrorOverlay hasUserCode={Object.keys(files).length > 0} />
          <div
            className="absolute inset-0"
            style={{
              visibility: activeTab === "preview" ? "visible" : "hidden",
              pointerEvents: activeTab === "preview" ? "auto" : "none",
            }}
          >
            <SandpackPreview
              style={{ height: "100%" }}
              showOpenInCodeSandbox={false}
              showRefreshButton={true}
            />
          </div>
          <div
            className="absolute inset-0 flex overflow-hidden"
            style={{
              visibility: activeTab === "code" ? "visible" : "hidden",
              pointerEvents: activeTab === "code" ? "auto" : "none",
            }}
          >
            {isMultiFile && (
              <div className="w-48 shrink-0 border-r border-gray-700 overflow-auto">
                <SandpackFileExplorer style={{ height: "100%" }} />
              </div>
            )}
            <div className="flex-1 overflow-auto">
              <SandpackCodeEditor
                style={{ height: "100%", minHeight: "100%" }}
                showLineNumbers
                showTabs={isMultiFile}
                readOnly
              />
            </div>
          </div>
        </SandpackProvider>
      </div>
    </div>
  );
}