const FILE_MARKER_REGEX = /^\/\/\s*---\s*FILE:\s*(.+?)\s*---\s*$/;
const DELETE_MARKER_REGEX = /^\/\/\s*---\s*DELETE:\s*(.+?)\s*---\s*$/;

export type FileMap = Record<string, string>;

function flattenIndexPath(filePath: string): string {
  const match = filePath.match(/^(.+)\/(index)\.(ts|tsx|js|jsx)$/);
  if (match) {
    return `${match[1]}.${match[3]}`;
  }
  return filePath;
}

export interface ParseResult {
  files: FileMap;
  deletions: string[];
}

export function parseMultiFileOutput(raw: string): ParseResult {
  const lines = raw.split("\n");
  const files: FileMap = {};
  const deletions: string[] = [];
  let currentPath: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const deleteMatch = line.match(DELETE_MARKER_REGEX);
    if (deleteMatch) {
      if (currentPath) {
        files[currentPath] = currentContent.join("\n").trim();
        currentPath = null;
        currentContent = [];
      }
      let delPath = deleteMatch[1].startsWith("/") ? deleteMatch[1] : `/${deleteMatch[1]}`;
      delPath = flattenIndexPath(delPath);
      deletions.push(delPath);
      continue;
    }

    const match = line.match(FILE_MARKER_REGEX);
    if (match) {
      if (currentPath) {
        files[currentPath] = currentContent.join("\n").trim();
      }
      let path = match[1].startsWith("/") ? match[1] : `/${match[1]}`;
      path = flattenIndexPath(path);
      currentPath = path;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentPath) {
    files[currentPath] = currentContent.join("\n").trim();
  }

  if (Object.keys(files).length === 0 && deletions.length === 0) {
    files["/App.tsx"] = raw.trim();
  }

  if (!files["/App.tsx"]) {
    const componentFiles = Object.keys(files).filter(
      (f) => f.endsWith(".tsx") || f.endsWith(".jsx")
    );
    if (componentFiles.length > 0) {
      const mainFile = componentFiles.find((f) =>
        f.toLowerCase().includes("app")
      );
      if (!mainFile) {
        const firstComponent = componentFiles[0];
        const moduleName = firstComponent
          .replace(/^\//, "")
          .replace(/\.(tsx|jsx)$/, "");

        const exportMatch = files[firstComponent].match(
          /export\s+default\s+function\s+(\w+)/
        );
        const componentName = exportMatch ? exportMatch[1] : "App";

        files["/App.tsx"] = `import ${componentName} from "./${moduleName}";\nexport default ${componentName};`;
      }
    }
  }

  return { files, deletions };
}

export function mergeFiles(existing: FileMap, incoming: FileMap, deletions: string[]): FileMap {
  const merged: FileMap = { ...existing };

  for (const [path, content] of Object.entries(incoming)) {
    merged[path] = content;
  }

  for (const path of deletions) {
    delete merged[path];
  }

  return merged;
}

export function serializeFileMap(files: FileMap): string {
  return Object.entries(files)
    .map(([path, content]) => `// --- FILE: ${path} ---\n${content}`)
    .join("\n\n");
}

export function getFileCount(files: FileMap): number {
  return Object.keys(files).length;
}
