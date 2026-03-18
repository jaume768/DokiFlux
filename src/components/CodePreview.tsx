"use client";

import { useState, useMemo } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";
import { dracula } from "@codesandbox/sandpack-themes";
import { Eye, Code2, Copy, Check, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FileMap } from "@/lib/parser";

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
              "lucide-react": "0.460.0",
            },
          }}
          options={{
            activeFile: "/App.tsx",
            externalResources: [
              "https://cdn.tailwindcss.com",
            ],
          }}
        >
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