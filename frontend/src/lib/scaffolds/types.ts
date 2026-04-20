import type { FrameworkId } from "@/lib/frameworks";

/**
 * Per-framework scaffold that defines every non-user file the WebContainer
 * needs to boot + run a preview dev server. User-generated files from the
 * AI are merged into `userFilesRoot` (or the container root if empty).
 */
export interface Scaffold {
  /** Framework id this scaffold targets. */
  framework: FrameworkId;
  /** Base files keyed by their absolute path inside the WebContainer root. */
  baseFiles: Record<string, string>;
  /**
   * Directory inside the container where user files are mounted.
   * E.g. "src" for React+Vite / Vue+Vite, "" (root) for Next.js App Router.
   */
  userFilesRoot: string;
  /** Command used to start the dev server (first entry + args). */
  devCommand: [string, ...string[]];
  /** Human-readable label shown in logs ("Vite dev server", "Next dev server"). */
  devServerLabel: string;
  /**
   * Runtime error-capture + navigation-tracking script injected into the
   * served HTML page (for Vite-based) or document (for Next). Optional per
   * framework — Vite injects via index.html, Next injects via layout.
   */
  runtimeHelpersScript?: string;
}
