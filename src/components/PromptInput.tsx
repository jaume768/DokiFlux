"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Loader2, Square } from "lucide-react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function PromptInput({ onSubmit, onCancel, isLoading }: PromptInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

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

  return (
    <div className="border-t bg-background p-4">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
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
      <p className="text-xs text-muted-foreground mt-2">
        {isLoading ? "Click the stop button to cancel generation" : "Press Enter to send, Shift+Enter for new line"}
      </p>
    </div>
  );
}
