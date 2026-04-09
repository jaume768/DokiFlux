"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Square } from "lucide-react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  currentProject?: string;
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>;
  projectId?: number;
}

export function PromptInput({ onSubmit, onCancel, isLoading }: PromptInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

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

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  return (
    <div className="border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="relative rounded-xl border bg-muted/40 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe la interfaz que quieres generar..."
          className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
      <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
        {isLoading ? "Haz clic en parar para cancelar" : "Enter para enviar · Shift+Enter para nueva línea"}
      </p>
    </div>
  );
}
