"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ActiveGenerationsContextType {
  activeGenerations: Map<number, number>;
  register: (projectId: number, generationId: number) => void;
  unregister: (projectId: number) => void;
  isActive: (projectId: number) => boolean;
}

const ActiveGenerationsContext = createContext<ActiveGenerationsContextType>({
  activeGenerations: new Map(),
  register: () => {},
  unregister: () => {},
  isActive: () => false,
});

export function ActiveGenerationsProvider({ children }: { children: ReactNode }) {
  const [activeGenerations, setActiveGenerations] = useState<Map<number, number>>(new Map());

  const register = useCallback((projectId: number, generationId: number) => {
    setActiveGenerations((prev) => {
      const next = new Map(prev);
      next.set(projectId, generationId);
      return next;
    });
  }, []);

  const unregister = useCallback((projectId: number) => {
    setActiveGenerations((prev) => {
      const next = new Map(prev);
      next.delete(projectId);
      return next;
    });
  }, []);

  const isActive = useCallback(
    (projectId: number) => activeGenerations.has(projectId),
    [activeGenerations]
  );

  return (
    <ActiveGenerationsContext.Provider value={{ activeGenerations, register, unregister, isActive }}>
      {children}
    </ActiveGenerationsContext.Provider>
  );
}

export function useActiveGenerations() {
  return useContext(ActiveGenerationsContext);
}
