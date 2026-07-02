"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { FRAMEWORK_LIST, DEFAULT_FRAMEWORK, type FrameworkId } from "@/lib/frameworks";
import { useAuth } from "@/context/AuthContext";

interface FrameworkSelectorProps {
  value: FrameworkId;
  onChange: (framework: FrameworkId) => void;
  disabled?: boolean;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  react: "text-cyan-400",
  vue: "text-emerald-400",
  angular: "text-red-400",
  nextjs: "text-white",
};

const FRAMEWORK_ICONS: Record<string, string> = {
  react: "⚛",
  vue: "🟢",
  angular: "🅰",
  nextjs: "▲",
};

export function FrameworkSelector({ value, onChange, disabled }: FrameworkSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { planType } = useAuth();
  const router = useRouter();
  const isPremium = planType === "premium";

  const selected = FRAMEWORK_LIST.find((f) => f.id === value) ?? FRAMEWORK_LIST[0];

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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={FRAMEWORK_COLORS[selected.id] ?? "text-zinc-300"}>
          {FRAMEWORK_ICONS[selected.id]}
        </span>
        <span className="truncate max-w-[100px]">{selected.shortName}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] max-h-[300px] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-900/80 sticky top-0">
            Framework
          </div>
          {FRAMEWORK_LIST.map((fw) => {
            const locked = (fw.premiumOnly && !isPremium) || !fw.available;
            const comingSoon = !fw.available;
            return (
              <button
                key={fw.id}
                type="button"
                onClick={() => {
                  if (comingSoon) return;
                  if (locked) {
                    setOpen(false);
                    router.push("/app/billing");
                    return;
                  }
                  onChange(fw.id);
                  setOpen(false);
                }}
                title={locked && !comingSoon ? "Disponible solo en Premium — haz clic para mejorar tu plan" : undefined}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  comingSoon
                    ? "text-zinc-600 cursor-not-allowed"
                    : locked
                    ? "hover:bg-zinc-800 text-zinc-300 opacity-60"
                    : `hover:bg-zinc-800 ${fw.id === value ? "bg-zinc-800 text-white" : "text-zinc-300"}`
                }`}
              >
                <span className={comingSoon ? "opacity-50" : (FRAMEWORK_COLORS[fw.id] ?? "text-zinc-300")}>
                  {FRAMEWORK_ICONS[fw.id]}
                </span>
                <span className="flex-1 font-medium flex items-center gap-1.5">
                  {fw.displayName}
                  {locked && !comingSoon && <Lock className="w-3 h-3 text-amber-400" />}
                </span>
                {comingSoon && fw.badgeText && (
                  <span className="flex items-center gap-0.5 text-[9px] font-medium text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                    {fw.badgeText}
                  </span>
                )}
                {locked && !comingSoon && (
                  <span className="text-[9px] font-medium text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded-full shrink-0">
                    Premium
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
