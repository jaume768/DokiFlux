import type { FrameworkId } from "@/lib/frameworks";
import type { Scaffold } from "./types";
import { reactScaffold } from "./react";
import { vueScaffold } from "./vue";
import { nextjsScaffold } from "./nextjs";

const SCAFFOLDS: Record<string, Scaffold> = {
  react: reactScaffold,
  vue: vueScaffold,
  nextjs: nextjsScaffold,
};

export function getScaffold(framework: FrameworkId | string | undefined): Scaffold {
  if (framework && SCAFFOLDS[framework]) return SCAFFOLDS[framework];
  return reactScaffold;
}

export type { Scaffold } from "./types";
