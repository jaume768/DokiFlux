"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Loader2, Square, Coins } from "lucide-react";
import { CostEstimate } from "@/types";
import { formatCost } from "@/lib/pricing";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

export function PromptInput({ onSubmit, onCancel, isLoading, history }: PromptInputProps) {
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
          body: JSON.stringify({ prompt: trimmed, history }),
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
    [history]
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

  return (
    <div className="border-t bg-background p-4">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the UI you want to generate..."
          className="min-h-[60px] max-h-[160px] resize-none"
          disabled={isLoading}
          rows={2}
        />
        {isLoading ? (
          <Button
            onClick={onCancel}
            size="icon"
            variant="destructive"
            className="shrink-0 h-[60px] w-[60px]"
          >
            <Square className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!value.trim()}
            size="icon"
            className="shrink-0 h-[60px] w-[60px]"
          >
            <SendHorizonal className="w-5 h-5" />
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Click the stop button to cancel generation" : "Press Enter to send, Shift+Enter for new line"}
        </p>
        {!isLoading && estimate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Coins className="w-3 h-3" />
            <span>
              Est. {formatCost(estimate.estimatedCostMin)} – {formatCost(estimate.estimatedCostMax)}
            </span>
            <span className="text-muted-foreground/60">
              ({estimate.inputTokens.toLocaleString()} input tokens)
            </span>
          </div>
        )}
        {!isLoading && estimateLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Estimating...</span>
          </div>
        )}
      </div>
    </div>
  );
}
