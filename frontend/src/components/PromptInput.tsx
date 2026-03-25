"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Loader2, Square, Coins } from "lucide-react";
import { CostEstimate } from "@/types";
import { formatCost } from "@/lib/pricing";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  currentProject?: string;
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

export function PromptInput({ onSubmit, onCancel, isLoading, currentProject, chatHistory }: PromptInputProps) {
  const [value, setValue] = useState("");
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortEstimateRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const fetchEstimate = useCallback(
    async (prompt: string) => {
      if (abortEstimateRef.current) {
        abortEstimateRef.current.abort();
      }

      const trimmed = prompt.trim();
      if (!trimmed) {
        setEstimate(null);
        return;
      }

      const controller = new AbortController();
      abortEstimateRef.current = controller;
      setEstimateLoading(true);

      try {
        const res = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed, currentProject, chatHistory }),
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          setEstimate(data.estimate);
        }
      } catch {
        // Abort or network error — ignore
      } finally {
        setEstimateLoading(false);
      }
    },
    [currentProject, chatHistory]
  );

  function handleChange(newValue: string) {
    setValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchEstimate(newValue);
    }, 600);
  }

  // Clear estimate when generation starts or finishes
  useEffect(() => {
    if (isLoading) {
      setEstimate(null);
    }
  }, [isLoading]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
    setEstimate(null);
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
    <div className="border-t bg-background p-4">
      <div className="relative rounded-xl border bg-muted/40 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the UI you want to generate..."
          className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
          rows={1}
          style={{ minHeight: "44px", maxHeight: "300px" }}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {!isLoading && estimate && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border">
              <Coins className="w-3 h-3" />
              <span>
                Est. {formatCost(estimate.estimatedCostMin)} – {formatCost(estimate.estimatedCostMax)}
              </span>
            </div>
          )}
          {!isLoading && estimateLoading && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
            </div>
          )}
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
        {isLoading ? "Click stop to cancel" : "Enter to send · Shift+Enter for new line"}
      </p>
    </div>
  );
}
