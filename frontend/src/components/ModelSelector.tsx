"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Cpu, Brain, Sparkles, Zap } from "lucide-react";
import { MODEL_LIST, DEFAULT_MODEL, type ModelId, type ModelConfig } from "@/lib/pricing";

interface ModelSelectorProps {
  value: ModelId;
  onChange: (model: ModelId) => void;
  disabled?: boolean;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  openai: <Cpu className="w-3.5 h-3.5" />,
  anthropic: <Brain className="w-3.5 h-3.5" />,
  gemini: <Sparkles className="w-3.5 h-3.5" />,
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: "text-green-400",
  anthropic: "text-orange-400",
  gemini: "text-blue-400",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google",
};

type GroupedModels = { provider: string; label: string; models: (ModelConfig & { id: ModelId })[] }[];

function groupModels(): GroupedModels {
  const groups: Record<string, (ModelConfig & { id: ModelId })[]> = {};
  for (const m of MODEL_LIST) {
    if (!groups[m.provider]) groups[m.provider] = [];
    groups[m.provider].push(m);
  }
  return Object.entries(groups).map(([provider, models]) => ({
    provider,
    label: PROVIDER_LABELS[provider] ?? provider,
    models,
  }));
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = MODEL_LIST.find((m) => m.id === value) ?? MODEL_LIST[0];
  const grouped = groupModels();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                   bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={PROVIDER_COLORS[selected.provider]}>
          {PROVIDER_ICONS[selected.provider]}
        </span>
        <span className="truncate max-w-[120px]">{selected.displayName}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[240px] max-h-[360px] overflow-y-auto
                        rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
          {grouped.map((group) => (
            <div key={group.provider}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-900/80 sticky top-0">
                {group.label}
              </div>
              {group.models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors
                    hover:bg-zinc-800 ${m.id === value ? "bg-zinc-800 text-white" : "text-zinc-300"}`}
                >
                  <span className={PROVIDER_COLORS[m.provider]}>
                    {PROVIDER_ICONS[m.provider]}
                  </span>
                  <span className="flex-1 font-medium">{m.displayName}</span>
                  <span className="text-[10px] text-zinc-500">
                    ${m.inputPerMillion}/{m.outputPerMillion}
                  </span>
                </button>
              ))}
            </div>
          ))}
          <div className="px-3 py-1.5 border-t border-zinc-800 text-[10px] text-zinc-600">
            Pricing per 1M tokens (in/out)
          </div>
        </div>
      )}
    </div>
  );
}
