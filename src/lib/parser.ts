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

/**
 * Incremental parser: detects completed files as text streams in.
 * A file is "complete" when we see the next FILE/DELETE marker or the stream ends.
 */
export class IncrementalParser {
  private emittedFiles: Set<string> = new Set();
  private lastMarkerCount = 0;

  /**
   * Call with the full accumulated text so far.
   * Returns newly completed files since the last call (path → content).
   * Does NOT return the file currently being written (last open file).
   */
  getNewlyCompletedFiles(raw: string): FileMap {
    const lines = raw.split("\n");
    const markers: { index: number; path: string; type: "file" | "delete" }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const dm = lines[i].match(DELETE_MARKER_REGEX);
      if (dm) {
        let p = dm[1].startsWith("/") ? dm[1] : `/${dm[1]}`;
        p = flattenIndexPath(p);
        markers.push({ index: i, path: p, type: "delete" });
        continue;
      }
      const fm = lines[i].match(FILE_MARKER_REGEX);
      if (fm) {
        let p = fm[1].startsWith("/") ? fm[1] : `/${fm[1]}`;
        p = flattenIndexPath(p);
        markers.push({ index: i, path: p, type: "file" });
      }
    }

    // No new markers since last check → nothing new completed
    if (markers.length <= this.lastMarkerCount) return {};

    const newFiles: FileMap = {};

    // All markers except the last one represent completed files
    // (the last marker's file is still being written)
    for (let m = 0; m < markers.length - 1; m++) {
      const marker = markers[m];
      if (marker.type !== "file") continue;
      if (this.emittedFiles.has(marker.path)) continue;

      const startLine = marker.index + 1;
      const endLine = markers[m + 1].index;
      const content = lines.slice(startLine, endLine).join("\n").trim();
      newFiles[marker.path] = content;
      this.emittedFiles.add(marker.path);
    }

    this.lastMarkerCount = markers.length;
    return newFiles;
  }

  reset() {
    this.emittedFiles.clear();
    this.lastMarkerCount = 0;
  }
}
