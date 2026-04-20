import type { Scaffold } from "./types";
import { RUNTIME_HELPERS_SCRIPT } from "./runtimeHelpers";

const PACKAGE_JSON = {
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
      ${RUNTIME_HELPERS_SCRIPT}
    </script>
  </body>
</html>
`;

const MAIN_TSX = `import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
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

export const reactScaffold: Scaffold = {
  framework: "react",
  userFilesRoot: "src",
  devCommand: ["npm", "run", "dev"],
  devServerLabel: "Vite dev server",
  baseFiles: {
    "package.json": JSON.stringify(PACKAGE_JSON, null, 2),
    "vite.config.ts": VITE_CONFIG,
    "tailwind.config.js": TAILWIND_CONFIG,
    "postcss.config.js": POSTCSS_CONFIG,
    "index.html": INDEX_HTML,
    "tsconfig.json": JSON.stringify(TSCONFIG, null, 2),
    "src/main.tsx": MAIN_TSX,
    "src/index.css": INDEX_CSS,
  },
};
