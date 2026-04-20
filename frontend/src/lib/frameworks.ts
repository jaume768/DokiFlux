export interface FrameworkConfig {
  displayName: string;
  shortName: string;
  available: boolean;
  badgeText?: string;
}

const FRAMEWORK_REGISTRY: Record<string, FrameworkConfig> = {
  react: {
    displayName: "React + Vite",
    shortName: "React",
    available: true,
  },
  vue: {
    displayName: "Vue 3 + Vite",
    shortName: "Vue",
    available: true,
  },
  nextjs: {
    displayName: "Next.js",
    shortName: "Next.js",
    available: true,
  },
  angular: {
    displayName: "Angular",
    shortName: "Angular",
    available: false,
    badgeText: "Próximamente",
  },
};

export type FrameworkId = keyof typeof FRAMEWORK_REGISTRY;

export const DEFAULT_FRAMEWORK: FrameworkId = "react";

export const FRAMEWORK_LIST = Object.entries(FRAMEWORK_REGISTRY).map(([id, config]) => ({
  id: id as FrameworkId,
  ...config,
}));

export function getFrameworkConfig(id: FrameworkId): FrameworkConfig {
  return FRAMEWORK_REGISTRY[id] ?? FRAMEWORK_REGISTRY[DEFAULT_FRAMEWORK];
}

export function isValidFrameworkId(id: string): id is FrameworkId {
  return id in FRAMEWORK_REGISTRY;
}
