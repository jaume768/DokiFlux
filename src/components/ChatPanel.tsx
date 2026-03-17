"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TokenUsageBadge } from "@/components/TokenUsage";
import { Message } from "@/types";
import { User, Bot, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatPanel({ messages, isLoading }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-muted-foreground">
            <Bot className="w-12 h-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Dokiflux</h3>
            <p className="text-sm mt-1 max-w-[280px]">
              Describe the UI component you want to build and I&apos;ll generate the code for you.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <div
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {msg.role === "user" ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {msg.role === "user" ? (
                <p className="text-sm text-foreground whitespace-pre-wrap pt-1">
                  {msg.content}
                </p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    {msg.content.startsWith("Error:") ? (
                      <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span className={`text-sm ${msg.content.startsWith("Error:") ? "text-destructive" : "text-muted-foreground"}`}>
                      {msg.content}
                    </span>
                  </div>
                  {msg.usage && <TokenUsageBadge usage={msg.usage} />}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 flex items-center gap-2 pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Generating component...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
