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
  mountFiles: (files: FileMap) => Promise<void>;
  writeFile: (path: string, content: string) => Promise<void>;
  isReady: boolean;
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
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
}

async function bootWebContainer(): Promise<WebContainer> {
  if (wcInstance) return wcInstance;
  if (wcBootPromise) return wcBootPromise;

  wcBootPromise = (async () => {
    try {
      const instance = await WebContainer.boot();
      wcInstance = instance;
      return instance;
    } catch (firstErr) {
      // Boot can fail if a stale Service Worker from a previous session is still
      // registered. Clear all SWs and retry once.
      console.warn("[WebContainer] First boot failed, clearing SWs and retrying…", firstErr);
      await clearServiceWorkers();
      await new Promise((r) => setTimeout(r, 300));
      try {
        const instance = await WebContainer.boot();
        wcInstance = instance;
        return instance;
      } catch (retryErr) {
        wcBootPromise = null;
        wcInstance = null;
        throw retryErr;
      }
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

export function useWebContainer(): UseWebContainerReturn {
  const [status, setStatus] = useState<ContainerStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const containerRef = useRef<WebContainer | null>(null);
  const serverProcessRef = useRef<any>(null);
  const isInstalledRef = useRef(false);
  const isMountedRef = useRef(true);

  const addLog = useCallback((msg: string) => {
    if (!isMountedRef.current) return;
    setLogs((prev) => [...prev.slice(-150), msg]);
  }, []);

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
    [addLog]
  );

  const writeFile = useCallback(
    async (filePath: string, content: string) => {
      const container = containerRef.current;
      if (!container) return;
      try {
        const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
        const fullPath = `/src/${cleanPath}`;
        // Ensure parent directories exist
        const parts = fullPath.split("/");
        for (let i = 2; i < parts.length; i++) {
          const dir = parts.slice(0, i).join("/");
          try {
            await container.fs.mkdir(dir, { recursive: true });
          } catch {
            // directory may already exist
          }
        }
        await container.fs.writeFile(fullPath, content);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        addLog(`writeFile error (${filePath}): ${msg}`);
      }
    },
    [addLog]
  );

  const isReady = status === "ready";

  return { status, previewUrl, error, logs, mountFiles, writeFile, isReady };
}
