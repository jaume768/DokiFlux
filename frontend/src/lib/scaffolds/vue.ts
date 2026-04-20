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
    vue: "^3.5.13",
    "vue-router": "^4.4.5",
    "lucide-vue-next": "^0.460.0",
  },
  devDependencies: {
    "@vitejs/plugin-vue": "^5.2.1",
    vite: "^6.0.0",
    "vue-tsc": "^2.2.0",
    typescript: "^5.6.0",
    tailwindcss: "^3.4.17",
    postcss: "^8.4.49",
    autoprefixer: "^10.4.20",
  },
};

const VITE_CONFIG = `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
});
`;

const TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./**/*.{js,ts,vue}"],
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
    <script type="module" src="/src/main.ts"></script>
    <script>
      ${RUNTIME_HELPERS_SCRIPT}
    </script>
  </body>
</html>
`;

// main.ts boots Vue + mounts the router. Routes come from /src/router.ts,
// which the scaffold always provides with a default `[{ path: "/", component: App }]`.
// The AI may OVERWRITE /router.ts to add more routes, but it must keep the
// named export `routes: RouteRecordRaw[]`. This mirrors how React's scaffold
// provides BrowserRouter at the root.
const MAIN_TS = `import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import { routes } from "./router";
import "./index.css";

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount("#root");
`;

// Default router — AI can overwrite this file to define additional routes.
// As long as the named export `routes` exists and is a RouteRecordRaw[],
// main.ts will work without modification.
const ROUTER_TS = `import type { RouteRecordRaw } from "vue-router";
import App from "./App.vue";

export const routes: RouteRecordRaw[] = [
  { path: "/", component: App },
];
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
    strict: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noFallthroughCasesInSwitch: true,
    allowJs: true,
  },
  include: ["src"],
};

export const vueScaffold: Scaffold = {
  framework: "vue",
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
    "src/main.ts": MAIN_TS,
    "src/router.ts": ROUTER_TS,
    "src/index.css": INDEX_CSS,
  },
};
