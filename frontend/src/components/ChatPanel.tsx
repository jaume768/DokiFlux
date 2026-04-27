"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TokenUsageBadge } from "@/components/TokenUsage";
import { Message, GenerationProgress } from "@/types";
import { User, Bot, AlertCircle, Loader2, Code2, Brain, FileCode2, Package, RotateCcw, Sparkles, Wrench } from "lucide-react";
import { TaskProgress } from "@/components/TaskProgress";
import { Button } from "@/components/ui/button";

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  genProgress?: GenerationProgress;
  onRestore?: (generationId: number) => void;
  isRestoring?: boolean;
  isAutoFixing?: boolean;
  isBackgroundGen?: boolean;
}

function AssistantMessage({ msg, onRestore, isRestoring }: { msg: Message; onRestore?: (generationId: number) => void; isRestoring?: boolean }) {
  const msgType = msg.type || (msg.rawCode ? "code" : msg.content.startsWith("Error:") || msg.content === "Generation cancelled." ? "error" : "chat");

  if (msgType === "chat") {
    return (
      <div className="space-y-1.5 pt-1">
        <div className="text-[17px] leading-[1.55] text-foreground max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="my-1.5">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-1">{children}</ol>,
              li: ({ children }) => <li className="pl-0.5">{children}</li>,
              h1: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-1.5">{children}</h2>,
              h2: ({ children }) => <h3 className="text-base font-bold mt-2.5 mb-1">{children}</h3>,
              h3: ({ children }) => <h4 className="text-[17px] font-semibold mt-2 mb-1">{children}</h4>,
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <pre className="my-2 rounded-md bg-muted p-3 overflow-x-auto">
                      <code className="text-sm font-mono text-foreground">{children}</code>
                    </pre>
                  );
                }
                return <code className="rounded bg-muted px-1 py-0.5 text-sm font-mono text-primary">{children}</code>;
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
          <Code2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-[17px] text-muted-foreground">
            {msg.content}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {msg.usage && <TokenUsageBadge usage={msg.usage} />}
          {msg.generationId && onRestore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              onClick={() => onRestore(msg.generationId!)}
              disabled={isRestoring}
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
        <span className="text-[17px] text-destructive">
          {msg.content}
        </span>
      </div>
      {msg.usage && <TokenUsageBadge usage={msg.usage} />}
    </div>
  );
}

const PHASE_CONFIG = {
  analyzing: {
    label: "Analizando tu solicitud...",
    icon: Brain,
    color: "text-blue-500",
    barColor: "bg-blue-500",
  },
  planning: {
    label: "Planificando archivos...",
    icon: Sparkles,
    color: "text-violet-500",
    barColor: "bg-violet-500",
  },
  writing: {
    label: "Escribiendo código...",
    icon: FileCode2,
    color: "text-amber-500",
    barColor: "bg-amber-500",
  },
  "writing-files": {
    label: "Escribiendo código...",
    icon: FileCode2,
    color: "text-amber-500",
    barColor: "bg-amber-500",
  },
  reviewing: {
    label: "Revisando código...",
    icon: Sparkles,
    color: "text-violet-500",
    barColor: "bg-violet-500",
  },
  fixing: {
    label: "Revisando y corrigiendo errores...",
    icon: Wrench,
    color: "text-amber-400",
    barColor: "bg-amber-400",
  },
  mounting: {
    label: "Configurando vista previa...",
    icon: Package,
    color: "text-emerald-500",
    barColor: "bg-emerald-500",
  },
} as const;

/** Extract file paths from streamingCode markers (`// --- FILE: /path ---`).
 *  Used as a fallback when the backend planner doesn't emit a `plan` event
 *  (e.g. when it falls back to single-shot streaming) — we still show the
 *  same task list UI by deriving it from the raw stream. */
function extractStreamingTasks(streamingCode?: string): {
  tasks: { file_path: string; action: "create" | "update"; label: string }[];
  currentIndex: number;
} {
  if (!streamingCode) return { tasks: [], currentIndex: -1 };
  const matches = Array.from(streamingCode.matchAll(/--- FILE: ([^\s]+)/g));
  const tasks = matches.map((m) => ({
    file_path: m[1],
    action: "create" as const,
    label: `Creating ${m[1]}`,
  }));
  // The last detected file is the one currently being written; everything
  // before it is considered already complete.
  return { tasks, currentIndex: tasks.length > 0 ? tasks.length - 1 : -1 };
}

function GenerationProgressIndicator({ progress }: { progress: GenerationProgress }) {
  const phase = progress.phase;
  if (!phase) return null;

  const hasTasks = progress.tasks && progress.tasks.length > 0;

  if (hasTasks) {
    return (
      <div className="flex gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
          <Bot className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <TaskProgress
            thinking={progress.thinking}
            tasks={progress.tasks!}
            currentTaskIndex={progress.currentTaskIndex ?? -1}
            completedFiles={progress.completedFiles ?? []}
          />
        </div>
      </div>
    );
  }

  // Fallback: backend went through legacy single-shot streaming (no `plan`
  // event). Derive a tasks list from the file markers in the raw stream so
  // the user still sees what's being created in real time.
  const synthesized = extractStreamingTasks(progress.streamingCode);
  if ((phase === "writing-files" || phase === "writing") && synthesized.tasks.length > 0) {
    return (
      <div className="flex gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
          <Bot className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <TaskProgress
            thinking={progress.thinking}
            tasks={synthesized.tasks}
            currentTaskIndex={synthesized.currentIndex}
            completedFiles={synthesized.tasks
              .slice(0, Math.max(0, synthesized.currentIndex))
              .map((t) => t.file_path)}
          />
        </div>
      </div>
    );
  }

  const config = PHASE_CONFIG[phase] ?? PHASE_CONFIG["writing"];
  const Icon = config.icon;

  const ESTIMATED_CHARS = 15000;
  const FIX_ESTIMATED_CHARS = 4000;
  let percent = 0;
  if (phase === "analyzing" || phase === "planning") {
    percent = 5;
  } else if (phase === "writing" || phase === "writing-files") {
    percent = Math.min(90, 10 + (progress.charsReceived / ESTIMATED_CHARS) * 80);
  } else if (phase === "reviewing") {
    // Review is a single LLM call with no per-chunk signal — use a gentle
    // indeterminate baseline so the bar isn't stuck at 0.
    percent = 85;
  } else if (phase === "fixing") {
    // Live bar fed by backend `fix_progress` heartbeats.
    percent = Math.min(94, 82 + (progress.charsReceived / FIX_ESTIMATED_CHARS) * 12);
  } else if (phase === "mounting") {
    percent = 95;
  }

  const filesLabel =
    phase === "writing-files" && progress.filesDetected > 0
      ? ` (${progress.filesDetected} archivo${progress.filesDetected !== 1 ? "s" : ""})`
      : "";

  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
        <Bot className="w-4 h-4" />
      </div>
      <div className="flex-1 pt-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.color} ${phase !== "mounting" ? "animate-pulse" : ""}`} />
          <span className={`text-[17px] font-medium ${config.color}`}>
            {config.label}{filesLabel}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${config.barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {progress.charsReceived > 0 && phase !== "reviewing" && phase !== "fixing" && (
          <p className="text-xs text-muted-foreground">
            {(progress.charsReceived / 1000).toFixed(1)}k caracteres recibidos
          </p>
        )}
        {phase === "reviewing" && (
          <p className="text-xs text-muted-foreground">
            Comprobando imports, exports y dependencias entre archivos…
          </p>
        )}
        {phase === "fixing" && (
          <p className="text-xs text-muted-foreground">
            Buscando archivos truncados, bugs de tipos y errores de sintaxis
            {progress.charsReceived > 0 ? ` · ${(progress.charsReceived / 1000).toFixed(1)}k caracteres` : ""}…
          </p>
        )}
      </div>
    </div>
  );
}

export function ChatPanel({ messages, isLoading, genProgress, onRestore, isRestoring, isAutoFixing, isBackgroundGen }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Scroll to bottom when the virtual keyboard opens/closes on mobile
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    };
    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  // Check if the last message is a streaming chat message (no usage yet, type=chat, and loading)
  const lastMsg = messages[messages.length - 1];
  const isStreamingChat = isLoading && lastMsg?.role === "assistant" && lastMsg?.type === "chat" && !lastMsg?.usage;

  // Check if we're actively generating code (has a non-null phase)
  const isGeneratingCode = isLoading && genProgress?.phase != null;

  return (
    <ScrollArea className="flex-1 min-h-0 overflow-hidden">
      <div className="p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-muted-foreground">
            <Bot className="w-12 h-12 mb-4 opacity-50" />
            <h3 className="text-xl font-medium">Dokiflux</h3>
            <p className="text-[17px] mt-2 max-w-[280px] leading-relaxed">
              Describe lo que quieres crear. Puedo ayudarte a definir la idea y generar el código cuando estés listo.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center self-end mb-0.5 ${
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

            {/* Bubble */}
            <div className={`min-w-0 max-w-[82%] ${msg.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}`}>
              {msg.role === "user" ? (
                <div className="rounded-2xl rounded-br-sm px-4 py-2.5 bg-primary text-primary-foreground">
                  <p className="text-[17px] leading-[1.55] whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 bg-muted/70 w-full">
                  <AssistantMessage msg={msg} onRestore={onRestore} isRestoring={isRestoring} />
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && !isStreamingChat && isGeneratingCode && genProgress && !isBackgroundGen && (
          <GenerationProgressIndicator progress={genProgress} />
        )}

        {isLoading && !isStreamingChat && (!isGeneratingCode || isBackgroundGen) && (
          <div className="flex gap-3">
            <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center gap-2 pt-1">
              {isAutoFixing ? (
                <>
                  <Wrench className="w-4 h-4 animate-pulse text-amber-500" />
                  <span className="text-[17px] text-amber-500">
                    Corrigiendo error...
                  </span>
                </>
              ) : isBackgroundGen ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-[17px] text-blue-500">
                    Generando en segundo plano...
                  </span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-[17px] text-muted-foreground">
                    Generando...
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
