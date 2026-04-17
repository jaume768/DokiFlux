"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { WebContainer } from "@webcontainer/api";
import type { FileMap } from "@/lib/parser";

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

const VITE_PACKAGE_JSON = {
  name: "preview-project",
  private: true,
  type: "module" as const,
  scripts: {
    dev: "vite --host 0.0.0.0",
  },
  dependencies: {
    react: "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.460.0",
    "react-router-dom": "^7.1.1",
  },
  devDependencies: {
    "@vitejs/plugin-react": "^4.3.4",
    vite: "^6.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    typescript: "^5.6.0",
    tailwindcss: "^3.4.17",
    postcss: "^8.4.49",
    autoprefixer: "^10.4.20",
  },
};

const VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
});
`;

const TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
`;

const POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

const INDEX_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      (function() {
        function reportPath() {
          var p = location.pathname + location.search + location.hash;
          window.parent.postMessage({ type: 'dokiflux-navigation', path: p }, '*');
        }
        var origPush = history.pushState;
        var origReplace = history.replaceState;
        history.pushState = function() {
          origPush.apply(this, arguments);
          reportPath();
        };
        history.replaceState = function() {
          origReplace.apply(this, arguments);
          reportPath();
        };
        window.addEventListener('popstate', reportPath);
        window.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'dokiflux-navigate') {
            history.pushState({}, '', e.data.path);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        });
        document.addEventListener('DOMContentLoaded', reportPath);
      })();
    </script>
  </body>
</html>
`;

const MAIN_TSX = `import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Runtime error capture - send to parent for autofix
(function setupErrorCapture() {
  var lastError = "";
  var errorTimeout = null;
  
  function sendError(error) {
    // Debounce to avoid spam
    if (error === lastError) return;
    lastError = error;
    if (errorTimeout) clearTimeout(errorTimeout);
    errorTimeout = setTimeout(function() {
      window.parent.postMessage({ type: "dokiflux-runtime-error", error: error }, "*");
    }, 500);
  }
  
  window.onerror = function(message, source, lineno, colno, error) {
    var errorMsg = message + " at " + source + ":" + lineno + ":" + colno;
    if (error && error.stack) errorMsg += "\\n" + error.stack;
    sendError(errorMsg);
    return false;
  };
  
  window.onunhandledrejection = function(event) {
    var reason = event.reason;
    var errorMsg = "Unhandled Promise Rejection: ";
    if (reason instanceof Error) {
      errorMsg += reason.message;
      if (reason.stack) errorMsg += "\\n" + reason.stack;
    } else {
      errorMsg += String(reason);
    }
    sendError(errorMsg);
  };
  
  // Capture console.error as well
  var originalConsoleError = console.error;
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    var errorMsg = args.map(function(arg) {
      if (arg instanceof Error) return arg.message + (arg.stack ? "\\n" + arg.stack : "");
      if (typeof arg === "object") return JSON.stringify(arg);
      return String(arg);
    }).join(" ");
    sendError("Console Error: " + errorMsg);
    originalConsoleError.apply(console, arguments);
  };
})();

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Notify parent frame ONLY after React has actually painted visible content.
// MutationObserver detects when React inserts children into #root,
// then we wait for stylesheets + paint to settle before signalling ready.
(function waitForContent() {
  var rootEl = document.getElementById("root");
  if (!rootEl) return;

  function signalReady() {
    requestAnimationFrame(function() {
      setTimeout(function() {
        window.parent.postMessage({ type: "dokiflux-content-ready" }, "*");
      }, 150);
    });
  }

  if (rootEl.children.length > 0) {
    signalReady();
    return;
  }

  var observer = new MutationObserver(function() {
    if (rootEl.children.length > 0) {
      observer.disconnect();
      signalReady();
    }
  });
  observer.observe(rootEl, { childList: true });
})();
`;

const TSCONFIG = {
  compilerOptions: {
    target: "ES2020",
    useDefineForClassFields: true,
    lib: ["ES2020", "DOM", "DOM.Iterable"],
    module: "ESNext",
    skipLibCheck: true,
    moduleResolution: "bundler",
    allowImportingTsExtensions: true,
    isolatedModules: true,
    moduleDetection: "force",
    noEmit: true,
    jsx: "react-jsx",
    strict: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noFallthroughCasesInSwitch: true,
    allowJs: true,
  },
  include: ["src"],
};

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
  // Also clear stale caches that previous WebContainer sessions may have left
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
      // the initial page load. If a client-side navigation (Next.js router)
      // brought us here from a page without those headers, the flag will be
      // false and WebContainer.boot() will throw before it even starts.
      // Force a single hard reload so the browser re-requests the page with
      // the correct headers applied. This is a one-shot — there is no retry
      // loop here.
      if (typeof window !== "undefined" && !window.crossOriginIsolated) {
        console.warn("[WebContainer] crossOriginIsolated is false – reloading to apply COOP/COEP headers.");
        window.location.reload();
        // Return a never-resolving promise so callers don't continue while
        // the page reloads.
        return new Promise<WebContainer>(() => {});
      }

      // Proactively clear stale Service Workers from previous sessions
      // to prevent them from serving blank/stale content in the iframe.
      await clearServiceWorkers();
      const instance = await WebContainer.boot();
      wcInstance = instance;
      return instance;
    } catch (err) {
      // WebContainer.boot() failed. Calling boot() again in the same page session
      // will always throw "Unable to create more instances" because WebContainer
      // internally registers the instance even when it throws. Clear stale Service
      // Workers so a manual reload succeeds, then surface the original error.
      console.warn("[WebContainer] Boot failed, clearing SWs…", err);
      await clearServiceWorkers();
      wcBootPromise = null;
      wcInstance = null;
      throw err;
    }
  })();

  return wcBootPromise;
}

function buildFileTree(files: FileMap) {
  const fileTree: Record<string, any> = {};

  // Scaffold files
  fileTree["package.json"] = {
    file: { contents: JSON.stringify(VITE_PACKAGE_JSON, null, 2) },
  };
  fileTree["vite.config.ts"] = { file: { contents: VITE_CONFIG } };
  fileTree["tailwind.config.js"] = {
    file: { contents: TAILWIND_CONFIG },
  };
  fileTree["postcss.config.js"] = { file: { contents: POSTCSS_CONFIG } };
  fileTree["index.html"] = { file: { contents: INDEX_HTML } };
  fileTree["tsconfig.json"] = {
    file: { contents: JSON.stringify(TSCONFIG, null, 2) },
  };

  // Build src directory tree
  const srcFiles: Record<string, any> = {};
  srcFiles["main.tsx"] = { file: { contents: MAIN_TSX } };
  srcFiles["index.css"] = { file: { contents: INDEX_CSS } };

  // Map user files into src/
  for (const [path, content] of Object.entries(files)) {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    const parts = cleanPath.split("/");

    if (parts.length === 1) {
      srcFiles[parts[0]] = { file: { contents: content } };
    } else {
      let current = srcFiles;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = { directory: {} };
        }
        current = current[parts[i]].directory;
      }
      current[parts[parts.length - 1]] = {
        file: { contents: content },
      };
    }
  }

  fileTree["src"] = { directory: srcFiles };
  return fileTree;
}

// Patterns that indicate a build/compile error in Vite dev server output
const BUILD_ERROR_PATTERNS = [
  /\[plugin:vite:/,
  /SyntaxError:/,
  /TypeError:/,
  /ReferenceError:/,
  /error TS\d+/,
  /✘ \[ERROR\]/,
  /Transform failed/,
  /Build failed/,
  /Could not resolve/,
  /Module not found/,
  /Failed to resolve import/,
];

function isBuildErrorLine(line: string): boolean {
  return BUILD_ERROR_PATTERNS.some((p) => p.test(line));
}

export function useWebContainer(): UseWebContainerReturn {
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
      if (fullError) {
        setLastBuildError(fullError);
      }
      errorBufferRef.current = [];
    }
    errorTimerRef.current = null;
  }, []);

  const addLog = useCallback((msg: string) => {
    if (!isMountedRef.current) return;
    setLogs((prev) => [...prev.slice(-150), msg]);

    // Only detect build errors from the dev server phase
    if (!isDevServerRef.current) return;

    // If this line looks like an error start, begin collecting
    if (isBuildErrorLine(msg)) {
      errorBufferRef.current = [msg];
      // Debounce: wait for more lines to arrive before reporting
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(flushErrorBuffer, 2000);
    } else if (errorBufferRef.current.length > 0) {
      // Continue collecting lines after an error start (context lines)
      errorBufferRef.current.push(msg);
      // Reset the debounce timer
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(flushErrorBuffer, 2000);
    }
  }, [flushErrorBuffer]);

  // Track component mount state
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

  // Listen for runtime errors from iframe
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

          // Listen for server-ready (only once per instance)
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
        const fileTree = buildFileTree(files);
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
              // Filter out spinner characters for cleaner logs
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
        addLog("Starting Vite dev server...");

        const devProcess = await container.spawn("npm", ["run", "dev"], {
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
      // Kill running server
      if (serverProcessRef.current) {
        try {
          serverProcessRef.current.kill();
        } catch {
          // ignore
        }
        serverProcessRef.current = null;
      }
      // Teardown container instance so it gets re-booted
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
      setStatus("idle");
      // Small delay to let the teardown settle
      await new Promise((r) => setTimeout(r, 400));
      if (isMountedRef.current) {
        await mountFiles(files);
      }
    },
    [mountFiles]
  );

  return { status, previewUrl, error, logs, lastBuildError, lastRuntimeError, clearBuildError, clearRuntimeError, mountFiles, restartContainer };
}
