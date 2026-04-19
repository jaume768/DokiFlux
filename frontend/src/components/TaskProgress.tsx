"use client";

import { Check, Loader2, Circle, Brain, FileCode2 } from "lucide-react";
import { PlanTask } from "@/types";

interface TaskProgressProps {
  thinking?: string;
  tasks: PlanTask[];
  currentTaskIndex: number;
  completedFiles: string[];
}

// Localized action labels. Kept in Spanish to match the current UI language.
// TODO: replace with real i18n when multi-language support is introduced.
const ACTION_LABELS: Record<"create" | "update", string> = {
  create: "Creando",
  update: "Actualizando",
};

function renderTaskLabel(task: { action?: "create" | "update"; file_path: string; label: string }): string {
  if (task.action) {
    return `${ACTION_LABELS[task.action]} ${task.file_path}`;
  }
  // Fallback for older backend that only sent `label` ("Creating /..." / "Updating /...").
  return task.label
    .replace(/^Creating\s+/, "Creando ")
    .replace(/^Updating\s+/, "Actualizando ");
}

export function TaskProgress({ thinking, tasks, currentTaskIndex, completedFiles }: TaskProgressProps) {
  const completedSet = new Set(completedFiles);

  return (
    <div className="space-y-2.5 pt-1">
      {thinking && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Brain className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
          <span className="leading-relaxed italic">{thinking}</span>
        </div>
      )}

      <div className="space-y-1.5">
        {tasks.map((task, idx) => {
          const isDone = completedSet.has(task.file_path);
          const isActive = idx === currentTaskIndex && !isDone;
          const isPending = idx > currentTaskIndex && !isDone;
          const displayLabel = renderTaskLabel(task);

          return (
            <div key={task.file_path} className="flex items-center gap-2">
              <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                {isDone ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : (
                  <Circle className="w-3 h-3 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                {isActive && (
                  <FileCode2 className="w-3 h-3 text-amber-400 shrink-0" />
                )}
                <span
                  className={`text-xs truncate ${
                    isDone
                      ? "text-muted-foreground line-through"
                      : isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {displayLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
