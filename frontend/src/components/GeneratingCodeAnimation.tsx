"use client";

import { useEffect, useMemo, useState } from "react";
import type { FileMap } from "@/lib/parser";

interface StreamingFile {
  path: string;
  isComplete: boolean;
}

/** Lightweight version of parseStreamingFiles — only paths + completion. */
function parsePaths(code: string): StreamingFile[] {
  const out: StreamingFile[] = [];
  const marker = "// --- FILE:";
  const parts = code.split(marker);
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const newlineIdx = part.indexOf("\n");
    const pathRaw =
      newlineIdx === -1
        ? part.replace(/\s*---\s*$/, "").trim()
        : part.slice(0, newlineIdx).replace(/\s*---\s*$/, "").trim();
    if (!pathRaw) continue;
    const isComplete = newlineIdx !== -1 && i < parts.length - 1;
    out.push({ path: pathRaw, isComplete });
  }
  return out;
}

interface GeneratingCodeAnimationProps {
  streamingCode?: string;
  existingFiles?: FileMap;
  filesDetected?: number;
  charsReceived?: number;
  isIteration?: boolean;
}

/**
 * v0-style "thinking" placeholder: a floating card showing which file is
 * being touched right now. Deliberately abstract — does NOT look like code.
 */
export function GeneratingCodeAnimation({
  streamingCode,
  existingFiles,
  isIteration = false,
}: GeneratingCodeAnimationProps) {
  const files = useMemo(
    () => (streamingCode ? parsePaths(streamingCode) : []),
    [streamingCode]
  );

  // Active = last incomplete file, or last file overall
  const activeIdx = useMemo(() => {
    if (files.length === 0) return -1;
    for (let i = files.length - 1; i >= 0; i--) {
      if (!files[i].isComplete) return i;
    }
    return files.length - 1;
  }, [files]);

  const activeFile = activeIdx >= 0 ? files[activeIdx] : null;
  const nextFile =
    activeIdx >= 0 && activeIdx + 1 < files.length ? files[activeIdx + 1] : null;

  const isCreating = activeFile
    ? !(existingFiles && existingFiles[activeFile.path] !== undefined)
    : !isIteration;

  const filename = activeFile
    ? activeFile.path.startsWith("/")
      ? activeFile.path.slice(1)
      : activeFile.path
    : null;

  const shortName = filename ? filename.split("/").pop() ?? filename : null;

  const actionVerb = isCreating ? "Creando" : "Actualizando";
  const label = shortName
    ? `${actionVerb} ${shortName}`
    : isIteration
    ? "Aplicando cambios"
    : "Generando proyecto";

  // Animated ellipsis (1 → 2 → 3 dots)
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 450);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center h-full overflow-hidden relative"
      style={{ background: "#0a0a0f" }}
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(99,102,241,0.10) 0%, transparent 70%)",
        }}
      />

      {/* Card stack */}
      <div className="relative" style={{ width: 320, height: 220 }}>
        {/* Peek card on the right */}
        <div
          className="absolute top-3 rounded-2xl"
          style={{
            left: 230,
            width: 220,
            height: 200,
            background: "rgba(20,20,30,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
            opacity: 0.55,
          }}
        >
          <div className="flex items-center gap-1 px-3 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
          </div>
        </div>

        {/* Active card — animated swap on file change */}
        <div
          key={activeFile?.path ?? "idle"}
          className="absolute top-0 left-0 rounded-2xl shadow-2xl"
          style={{
            width: 280,
            height: 200,
            background: "rgba(15,15,22,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 30px 60px -15px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.08)",
            animation: "card-swap-in 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
            transition: "box-shadow 0.3s ease",
          }}
        >
          {/* Title bar with mac dots + filename */}
          <div className="flex items-center px-3 py-2.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            </div>
            {/* Keyed so each filename fades-in independently when it changes */}
            <span
              key={filename ?? "idle-title"}
              className="flex-1 text-center text-[11px] font-mono text-white/60 truncate px-2"
              style={{ animation: "fade-slide-in 0.35s ease-out" }}
            >
              {filename ?? (isIteration ? "preparing..." : "starting...")}
            </span>
            <span className="w-[42px]" />
          </div>

          {/* Body — abstract pill skeleton */}
          <div className="p-4 space-y-2.5">
            <SkeletonRow widths={[40, 12]} delays={[0, 0.15]} />
            <SkeletonRow widths={[28, 18, 32]} delays={[0.3, 0.45, 0.6]} indent={1} />
            <SkeletonRow
              widths={[18, 12, 38]}
              delays={[0.75, 0.9, 1.05]}
              indent={1}
              accents={[0, 1, 0]}
            />
            <div className="h-1.5" />
            <SkeletonRow widths={[10]} delays={[1.2]} />
            <SkeletonRow widths={[24, 8, 14]} delays={[1.35, 1.5, 1.65]} indent={1} />
            <div className="flex items-center gap-1 mt-1 pl-[14px]">
              <span className="inline-block w-0.5 h-3 bg-white/70 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Action label — keyed crossfade when label text changes */}
      <div className="mt-12 flex flex-col items-center gap-2 px-4 text-center min-h-[54px]">
        <p
          key={label}
          className="text-[15px] font-medium text-white/90 tracking-tight"
          style={{ animation: "fade-slide-in 0.35s ease-out" }}
        >
          {label}
          <span className="inline-block w-6 text-left">
            {".".repeat(dots)}
          </span>
        </p>
        {files.length > 0 && (
          <p
            key={`${activeIdx}/${files.length}`}
            className="text-[12px] text-white/35"
            style={{ animation: "fade-slide-in 0.35s ease-out" }}
          >
            {Math.min(activeIdx + 1, files.length)} / {files.length}
            {nextFile ? ` · siguiente: ${nextFile.path.split("/").pop()}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

interface SkeletonRowProps {
  widths: number[];
  delays: number[];
  indent?: number;
  accents?: number[];
}

function SkeletonRow({ widths, delays, indent = 0, accents }: SkeletonRowProps) {
  return (
    <div className="flex items-center gap-2" style={{ paddingLeft: indent * 14 }}>
      {widths.map((w, i) => {
        const isAccent = accents?.[i] === 1;
        const grad = isAccent
          ? "linear-gradient(90deg, rgba(45,212,191,0.10) 0%, rgba(45,212,191,0.55) 50%, rgba(45,212,191,0.10) 100%)"
          : "linear-gradient(90deg, rgba(99,102,241,0.10) 0%, rgba(129,140,248,0.45) 50%, rgba(99,102,241,0.10) 100%)";
        return (
          <span
            key={i}
            className="block h-2.5 rounded-full"
            style={{
              width: `${w}%`,
              background: grad,
              backgroundSize: "200% 100%",
              animation: `shimmer 1.8s ease-in-out ${delays[i] ?? 0}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
