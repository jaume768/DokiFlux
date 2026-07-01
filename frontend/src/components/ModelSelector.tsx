"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Cpu, Brain, Sparkles, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ModelId, type ModelConfig } from "@/lib/pricing";
import { useModels } from "@/context/ModelsContext";
import { useAuth } from "@/context/AuthContext";

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

const PROVIDER_ORDER = ["anthropic", "openai", "gemini"];

type GroupedModels = { provider: string; label: string; models: ModelConfig[] }[];

function groupModels(models: ModelConfig[]): GroupedModels {
  const groups: Record<string, ModelConfig[]> = {};
  for (const m of models) {
    if (!groups[m.provider]) groups[m.provider] = [];
    groups[m.provider].push(m);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => {
      const ai = PROVIDER_ORDER.indexOf(a);
      const bi = PROVIDER_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([provider, items]) => ({
      provider,
      label: PROVIDER_LABELS[provider] ?? provider,
      models: items,
    }));
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { models, isLoaded } = useModels();
  const { planType } = useAuth();
  const router = useRouter();
  const isPremium = planType === "premium";

  const selected = models.find((m) => m.id === value) ?? models[0];
  const grouped = groupModels(models);

  const calcDropdownStyle = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const DROPDOWN_W = 260;
    const DROPDOWN_MAX_H = 360;
    const GAP = 4;
    const MARGIN = 8;

    const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;
    const style: React.CSSProperties = { minWidth: DROPDOWN_W };

    // Vertical: open downward if space, otherwise upward
    if (spaceBelow >= 120 || spaceBelow >= spaceAbove) {
      style.top = rect.bottom + GAP;
      style.maxHeight = Math.min(DROPDOWN_MAX_H, spaceBelow);
    } else {
      style.bottom = window.innerHeight - rect.top + GAP;
      style.maxHeight = Math.min(DROPDOWN_MAX_H, spaceAbove);
    }

    // Horizontal: align left, but clamp to right edge
    const leftAligned = rect.left;
    if (leftAligned + DROPDOWN_W > window.innerWidth - MARGIN) {
      style.right = MARGIN;
    } else {
      style.left = leftAligned;
    }

    setDropdownStyle(style);
  }, []);

  function handleToggle() {
    if (!open) calcDropdownStyle();
    setOpen((v) => !v);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      // Dropdown is rendered via portal to document.body, so it's NOT inside
      // `ref.current`. Check both the trigger wrapper AND the portal content;
      // otherwise the outside-click fires before the option's onClick and
      // closes the menu without committing the selection.
      const insideTrigger = ref.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isLoaded || !selected) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 border border-zinc-700 text-zinc-500 animate-pulse">
        Loading models…
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={PROVIDER_COLORS[selected.provider]}>
          {PROVIDER_ICONS[selected.provider]}
        </span>
        <span className="truncate max-w-[120px]">{selected.displayName}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl"
          style={dropdownStyle}
        >
          {grouped.map((group) => (
            <div key={group.provider}>
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-900 sticky top-0">
                {group.label}
              </div>
              {group.models.map((m) => {
                const locked = m.premiumOnly && !isPremium;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (locked) {
                        setOpen(false);
                        router.push("/app/billing");
                        return;
                      }
                      onChange(m.id);
                      setOpen(false);
                    }}
                    title={locked ? "Disponible solo en Premium — haz clic para mejorar tu plan" : undefined}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-800 ${m.id === value ? "bg-zinc-800 text-white" : "text-zinc-300"} ${locked ? "opacity-60" : ""}`}
                  >
                    <span className={PROVIDER_COLORS[m.provider]}>
                      {PROVIDER_ICONS[m.provider]}
                    </span>
                    <span className="flex-1 font-medium flex items-center gap-1.5">
                      {m.displayName}
                      {locked && <Lock className="w-3 h-3 text-amber-400" />}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0">
                      ${m.inputPerMillion}/{m.outputPerMillion}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="px-3 py-1.5 border-t border-zinc-800 text-xs text-zinc-600">
            Pricing per 1M tokens (in/out)
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
