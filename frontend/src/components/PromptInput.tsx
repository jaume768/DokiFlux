"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, SendHorizonal, Square, Trash2 } from "lucide-react";
import { apiDelete, apiForm, apiGet } from "@/lib/api";
import type { ProjectAsset, ProjectAssetKind } from "@/types/auth";

interface PublicConfig {
  features?: {
    project_assets_enabled?: boolean;
  };
}

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  currentProject?: string;
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>;
  projectId?: number;
}

export function PromptInput({ onSubmit, onCancel, isLoading, projectId }: PromptInputProps) {
  const [value, setValue] = useState("");
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [assetKind, setAssetKind] = useState<ProjectAssetKind>("other");
  const [isUploading, setIsUploading] = useState(false);
  const [assetsEnabled, setAssetsEnabled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    apiGet<PublicConfig>("/config/", { auth: false })
      .then((config) => setAssetsEnabled(Boolean(config.features?.project_assets_enabled)))
      .catch(() => setAssetsEnabled(false));
  }, []);

  useEffect(() => {
    if (!projectId || !assetsEnabled) {
      setAssets([]);
      return;
    }
    apiGet<ProjectAsset[]>(`/projects/${projectId}/assets/`)
      .then(setAssets)
      .catch(() => setAssets([]));
  }, [projectId, assetsEnabled]);

  function handleChange(newValue: string) {
    setValue(newValue);
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleUpload(fileList: FileList | null) {
    if (!projectId || !assetsEnabled || !fileList?.length) return;
    setIsUploading(true);
    try {
      const uploaded: ProjectAsset[] = [];
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("kind", assetKind);
        const asset = await apiForm<ProjectAsset>(`/projects/${projectId}/assets/`, formData);
        uploaded.push(asset);
      }
      setAssets((prev) => [...uploaded, ...prev]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAsset(assetId: number) {
    if (!projectId || !assetsEnabled) return;
    await apiDelete(`/projects/${projectId}/assets/${assetId}/`);
    setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
  }

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 300);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 300 ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  return (
    <div className="border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      {projectId && assetsEnabled ? (
        <div className="mb-3 rounded-xl border bg-muted/20 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
              disabled={isLoading || isUploading}
            />
            <select
              value={assetKind}
              onChange={(e) => setAssetKind(e.target.value as ProjectAssetKind)}
              disabled={isLoading || isUploading}
              className="h-8 rounded-lg border bg-background px-2 text-xs outline-none"
            >
              <option value="logo">Logo</option>
              <option value="hero">Hero</option>
              <option value="product">Producto</option>
              <option value="gallery">Galería</option>
              <option value="background">Fondo</option>
              <option value="other">Otro</option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={isLoading || isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {isUploading ? "Subiendo..." : "Subir imágenes"}
            </Button>
            {assets.length > 0 ? (
              <span className="text-xs text-muted-foreground">{assets.length} asset{assets.length === 1 ? "" : "s"}</span>
            ) : null}
          </div>
          {assets.length > 0 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {assets.map((asset) => (
                <div key={asset.id} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-background">
                  <img src={asset.url} alt={asset.original_name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(asset.id)}
                    disabled={isLoading || isUploading}
                    className="absolute right-1 top-1 hidden rounded bg-black/70 p-1 text-white group-hover:block"
                    aria-label="Eliminar imagen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
                    {asset.kind}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="relative rounded-xl border bg-muted/40 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe la interfaz que quieres generar..."
          className="w-full resize-none overflow-y-hidden bg-transparent px-4 pt-3 pb-12 text-[17px] leading-[1.55] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
          rows={1}
          style={{ minHeight: "44px", maxHeight: "300px" }}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {isLoading ? (
            <Button
              onClick={onCancel}
              size="icon"
              variant="destructive"
              className="h-8 w-8 rounded-lg"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!value.trim()}
              size="icon"
              className="h-8 w-8 rounded-lg"
            >
              <SendHorizonal className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 text-center">
        {isLoading ? "Haz clic en parar para cancelar" : "Enter para enviar · Shift+Enter para nueva línea"}
      </p>
    </div>
  );
}
