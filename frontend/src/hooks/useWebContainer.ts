"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { WebContainer } from "@webcontainer/api";
import type { FileMap } from "@/lib/parser";
import type { FrameworkId } from "@/lib/frameworks";
import { getScaffold } from "@/lib/scaffolds";

export type ContainerStatus =
  | "idle"
  | "booting"
  | "installing"
  | "starting"
  | "ready"
  | "error";

interface UseWebContainerReturn {
  status: ContainerStatus;
  previewUrl: string | null;
  error: string | null;
  logs: string[];
  lastBuildError: string | null;
  lastRuntimeError: string | null;
  clearBuildError: () => void;
  clearRuntimeError: () => void;
  mountFiles: (files: FileMap) => Promise<void>;
  restartContainer: (files: FileMap) => Promise<void>;
}

// Singleton: only one WebContainer can exist per browser tab.
// Module-level variables survive HMR but are lost on full page refresh.
// We teardown the instance on beforeunload so the Service Worker is cleaned up
// before the page reloads, preventing stale SW conflicts on the next boot.
let wcInstance: WebContainer | null = null;
let wcBootPromise: Promise<WebContainer> | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (wcInstance) {
      wcInstance.teardown();
      wcInstance = null;
      wcBootPromise = null;
    }
  });
}

async function clearServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  } catch {
    // ignore
  }
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }
}

async function bootWebContainer(): Promise<WebContainer> {
  if (wcInstance) return wcInstance;
  if (wcBootPromise) return wcBootPromise;

  wcBootPromise = (async () => {
    try {
      // SharedArrayBuffer (required by WebContainer) is only available when
      // crossOriginIsolated is true, which depends on COOP/COEP headers from
      // the initial page load. Force a hard reload if missing — one-shot, no retry.
      if (typeof window !== "undefined" && !window.crossOriginIsolated) {
        console.warn("[WebContainer] crossOriginIsolated is false – reloading to apply COOP/COEP headers.");
        window.location.reload();
        return new Promise<WebContainer>(() => {});
      }

      await clearServiceWorkers();
      const instance = await WebContainer.boot();
      wcInstance = instance;
      return instance;
    } catch (err) {
      console.warn("[WebContainer] Boot failed, clearing SWs…", err);
      await clearServiceWorkers();
      wcBootPromise = null;
      wcInstance = null;
      throw err;
    }
  })();

  return wcBootPromise;
}

/**
 * Build a nested directory tree (WebContainer mount format) from a flat
 * path → contents map, merging scaffold base files with user-generated files.
 */
function buildFileTree(
  userFiles: FileMap,
  baseFiles: Record<string, string>,
  userFilesRoot: string,
) {
  const flat: Record<string, string> = { ...baseFiles };

  // Prefix user files with the scaffold's userFilesRoot (e.g. "src/" or "").
  const prefix = userFilesRoot ? `${userFilesRoot.replace(/\/$/, "")}/` : "";
  for (const [rawPath, content] of Object.entries(userFiles)) {
    const cleanPath = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
    flat[`${prefix}${cleanPath}`] = content;
  }

  // Build nested tree from flat map.
  const tree: Record<string, any> = {};
  for (const [fullPath, content] of Object.entries(flat)) {
    const parts = fullPath.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    let cursor: Record<string, any> = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (!cursor[seg]) cursor[seg] = { directory: {} };
      cursor = cursor[seg].directory;
    }
    cursor[parts[parts.length - 1]] = { file: { contents: content } };
  }
  return tree;
}

// Patterns that indicate a build/compile error in dev server output (works
// for Vite, Next.js and generally for node-based build errors).
const BUILD_ERROR_PATTERNS = [
  /\[plugin:vite:/,
  /\bPlugin:\s*vite:/,            // same error but printed without brackets
  /Pre-transform error:/,          // Vite babel/parse errors on truncated files
  /Internal server error:/,        // Vite runtime error response
  /SyntaxError:/,
  /TypeError:/,
  /ReferenceError:/,
  /error TS\d+/,
  /✘ \[ERROR\]/,
  /#\s*\[ERROR\]/,                 // vite optimizer error format
  /Transform failed/,
  /Build failed/,
  /Could not resolve/,
  /Module not found/,
  /Failed to resolve import/,
  /Failed to scan for dependencies/,
  /Failed to compile/,
  /Unterminated (string|template|comment|regular expression)/, // truncation tells
  /Unexpected (token|end of file)/,
];

function isBuildErrorLine(line: string): boolean {
  return BUILD_ERROR_PATTERNS.some((p) => p.test(line));
}

export function useWebContainer(framework: FrameworkId | string = "react"): UseWebContainerReturn {
  const [status, setStatus] = useState<ContainerStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastBuildError, setLastBuildError] = useState<string | null>(null);
  const [lastRuntimeError, setLastRuntimeError] = useState<string | null>(null);
  const containerRef = useRef<WebContainer | null>(null);
  const serverProcessRef = useRef<any>(null);
  const isInstalledRef = useRef(false);
  const isMountedRef = useRef(true);
  const errorBufferRef = useRef<string[]>([]);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDevServerRef = useRef(false);
  const frameworkRef = useRef<string>(framework);

  // Keep ref in sync; we read it lazily inside callbacks.
  frameworkRef.current = framework;

  const clearBuildError = useCallback(() => {
    setLastBuildError(null);
    errorBufferRef.current = [];
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  const clearRuntimeError = useCallback(() => {
    setLastRuntimeError(null);
  }, []);

  const flushErrorBuffer = useCallback(() => {
    if (errorBufferRef.current.length > 0 && isMountedRef.current) {
      const fullError = errorBufferRef.current.join("\n").trim();
      if (fullError) setLastBuildError(fullError);
      errorBufferRef.current = [];
    }
    errorTimerRef.current = null;
  }, []);

  const addLog = useCallback((msg: string) => {
    if (!isMountedRef.current) return;
    setLogs((prev) => [...prev.slice(-150), msg]);

    if (!isDevServerRef.current) return;

    if (isBuildErrorLine(msg)) {
      errorBufferRef.current = [msg];
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(flushErrorBuffer, 2000);
    } else if (errorBufferRef.current.length > 0) {
      errorBufferRef.current.push(msg);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(flushErrorBuffer, 2000);
    }
  }, [flushErrorBuffer]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (serverProcessRef.current) {
        try {
          serverProcessRef.current.kill();
        } catch {
          // ignore
        }
        serverProcessRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || !isMountedRef.current) return;
      if (e.data.type === "dokiflux-runtime-error" && typeof e.data.error === "string") {
        setLastRuntimeError(e.data.error);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const mountFiles = useCallback(
    async (files: FileMap) => {
      const scaffold = getScaffold(frameworkRef.current as FrameworkId);
      console.log("[useWebContainer] mountFiles called", {
        framework: scaffold.framework,
        fileCount: Object.keys(files).length,
        hasContainer: !!containerRef.current,
        hasServer: !!serverProcessRef.current,
      });
      try {
        setError(null);

        // --- 1. Boot ---
        if (!containerRef.current) {
          setStatus("booting");
          setPreviewUrl(null);
          addLog("Booting WebContainer...");

          const instance = await bootWebContainer();
          if (!isMountedRef.current) return;

          containerRef.current = instance;
          addLog("WebContainer booted.");

          instance.on("server-ready", (_port: number, url: string) => {
            if (!isMountedRef.current) return;
            addLog(`Server ready at ${url}`);
            setPreviewUrl(url);
            setStatus("ready");
          });

          instance.on("error", ({ message }) => {
            if (!isMountedRef.current) return;
            addLog(`WebContainer error: ${message}`);
          });
        }

        const container = containerRef.current;

        // --- 2. Kill previous server ---
        if (serverProcessRef.current) {
          addLog("Stopping previous server...");
          try {
            serverProcessRef.current.kill();
          } catch {
            // ignore
          }
          serverProcessRef.current = null;
          setPreviewUrl(null);
          await new Promise((r) => setTimeout(r, 500));
        }

        // --- 3. Mount files ---
        const fileTree = buildFileTree(files, scaffold.baseFiles, scaffold.userFilesRoot);
        addLog("Mounting files...");
        await container.mount(fileTree);
        if (!isMountedRef.current) return;
        addLog(`Mounted ${Object.keys(files).length} user files + scaffold.`);

        // --- 4. Install dependencies (first time only) ---
        if (!isInstalledRef.current) {
          setStatus("installing");
          addLog("Running npm install...");

          const installProcess = await container.spawn("npm", ["install"], {
            terminal: { cols: 80, rows: 10 },
          });

          const installWriter = new WritableStream({
            write(data) {
              const clean = data.replace(/\[[\d;]*[A-Za-z]|\[[\?\d;]*[hlm]/g, "").trim();
              if (clean) addLog(clean);
            },
          });
          installProcess.output.pipeTo(installWriter).catch(() => {});

          const installExitCode = await installProcess.exit;
          if (!isMountedRef.current) return;

          if (installExitCode !== 0) {
            throw new Error(`npm install failed with exit code ${installExitCode}`);
          }
          addLog("npm install completed.");
          isInstalledRef.current = true;
        } else {
          addLog("Dependencies already installed, skipping npm install.");
        }

        // --- 5. Start dev server ---
        setStatus("starting");
        isDevServerRef.current = true;
        clearBuildError();
        addLog(`Starting ${scaffold.devServerLabel}...`);

        const [cmd, ...args] = scaffold.devCommand;
        const devProcess = await container.spawn(cmd, args, {
          terminal: { cols: 80, rows: 10 },
        });
        if (!isMountedRef.current) {
          devProcess.kill();
          return;
        }
        serverProcessRef.current = devProcess;

        const devWriter = new WritableStream({
          write(data) {
            const clean = data.replace(/\[[\d;]*[A-Za-z]|\[[\?\d;]*[hlm]/g, "").trim();
            if (clean) addLog(clean);
          },
        });
        devProcess.output.pipeTo(devWriter).catch(() => {});

        // server-ready event will set status to "ready" and provide URL
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        setStatus("error");
        addLog(`Error: ${msg}`);
      }
    },
    [addLog, clearBuildError]
  );

  const restartContainer = useCallback(
    async (files: FileMap) => {
      if (serverProcessRef.current) {
        try {
          serverProcessRef.current.kill();
        } catch {
          // ignore
        }
        serverProcessRef.current = null;
      }
      if (containerRef.current) {
        try {
          containerRef.current.teardown();
        } catch {
          // ignore
        }
        containerRef.current = null;
        wcInstance = null;
        wcBootPromise = null;
      }
      isInstalledRef.current = false;
      isDevServerRef.current = false;
      setPreviewUrl(null);
      setError(null);
      setLogs([]);
      await mountFiles(files);
    },
    [mountFiles]
  );

  return { status, previewUrl, error, logs, lastBuildError, lastRuntimeError, clearBuildError, clearRuntimeError, mountFiles, restartContainer };
}
