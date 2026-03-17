const FILE_MARKER_REGEX = /^\/\/\s*---\s*FILE:\s*(.+?)\s*---\s*$/;

export type FileMap = Record<string, string>;

function flattenIndexPath(filePath: string): string {
  const match = filePath.match(/^(.+)\/(index)\.(ts|tsx|js|jsx)$/);
  if (match) {
    return `${match[1]}.${match[3]}`;
  }
  return filePath;
}

export function parseMultiFileOutput(raw: string): FileMap {
  const lines = raw.split("\n");
  const files: FileMap = {};
  let currentPath: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
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

  if (Object.keys(files).length === 0) {
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

  return files;
}

export function getFileCount(files: FileMap): number {
  return Object.keys(files).length;
}
