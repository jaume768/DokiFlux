"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { BackendModel, ModelConfig, ModelId, DEFAULT_MODEL, normaliseModel } from "@/lib/pricing";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface ModelsContextValue {
  models: ModelConfig[];
  defaultModel: ModelId;
  isLoaded: boolean;
  getModelConfig: (id: ModelId) => ModelConfig | null;
  isValidModelId: (id: string) => boolean;
}

const ModelsContext = createContext<ModelsContextValue>({
  models: [],
  defaultModel: DEFAULT_MODEL,
  isLoaded: false,
  getModelConfig: () => null,
  isValidModelId: () => false,
});

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [defaultModel, setDefaultModel] = useState<ModelId>(DEFAULT_MODEL);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/models/`)
      .then((res) => res.json())
      .then((data: { models: BackendModel[]; default: string }) => {
        setModels(data.models.map(normaliseModel));
        setDefaultModel(data.default ?? DEFAULT_MODEL);
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  function getModelConfig(id: ModelId): ModelConfig | null {
    return models.find((m) => m.id === id) ?? null;
  }

  function isValidModelId(id: string): boolean {
    return models.some((m) => m.id === id);
  }

  return (
    <ModelsContext.Provider value={{ models, defaultModel, isLoaded, getModelConfig, isValidModelId }}>
      {children}
    </ModelsContext.Provider>
  );
}

export function useModels(): ModelsContextValue {
  return useContext(ModelsContext);
}
