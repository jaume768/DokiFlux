"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TokenUsageBadge } from "@/components/TokenUsage";
import { Message } from "@/types";
import { User, Bot, AlertCircle, Loader2, Code2 } from "lucide-react";

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
}

function AssistantMessage({ msg }: { msg: Message }) {
  const msgType = msg.type || (msg.rawCode ? "code" : msg.content.startsWith("Error:") || msg.content === "Generation cancelled." ? "error" : "chat");

  if (msgType === "chat") {
    return (
      <div className="space-y-1.5 pt-1">
        <div className="text-sm text-foreground leading-relaxed max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="my-1">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="pl-0.5">{children}</li>,
              h1: ({ children }) => <h2 className="text-base font-bold mt-3 mb-1">{children}</h2>,
              h2: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
              h3: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <pre className="my-2 rounded-md bg-muted p-3 overflow-x-auto">
                      <code className="text-xs font-mono text-foreground">{children}</code>
                    </pre>
                  );
                }
                return <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono text-primary">{children}</code>;
              },
              pre: ({ children }) => <>{children}</>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-2 border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground">
                  {children}
                </blockquote>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        {msg.usage && <TokenUsageBadge usage={msg.usage} />}
      </div>
    );
  }

  if (msgType === "code") {
    return (
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-sm text-muted-foreground">
            {msg.content}
          </span>
        </div>
        {msg.usage && <TokenUsageBadge usage={msg.usage} />}
      </div>
    );
  }

  // error / cancel
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
        <span className="text-sm text-destructive">
          {msg.content}
        </span>
      </div>
      {msg.usage && <TokenUsageBadge usage={msg.usage} />}
    </div>
  );
}

export function ChatPanel({ messages, isLoading }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Check if the last message is a streaming chat message (no usage yet, type=chat, and loading)
  const lastMsg = messages[messages.length - 1];
  const isStreamingChat = isLoading && lastMsg?.role === "assistant" && lastMsg?.type === "chat" && !lastMsg?.usage;

  return (
    <ScrollArea className="flex-1 min-h-0 overflow-hidden">
      <div className="p-4 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-muted-foreground">
            <Bot className="w-12 h-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Dokiflux</h3>
            <p className="text-sm mt-1 max-w-[280px]">
              Describe what you want to build. I can chat with you to refine the idea, then generate the code when ready.
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
                <AssistantMessage msg={msg} />
              )}
            </div>
          </div>
        ))}

        {isLoading && !isStreamingChat && (
          <div className="flex gap-3">
            <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 flex items-center gap-2 pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Generating...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
