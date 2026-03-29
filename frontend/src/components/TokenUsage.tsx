"use client";

import { Badge } from "@/components/ui/badge";
import { formatCost } from "@/lib/pricing";
import { TokenUsage as TokenUsageType, SessionStats } from "@/types";
import { Coins, Zap } from "lucide-react";

interface TokenUsageBadgeProps {
  usage: TokenUsageType;
}

export function TokenUsageBadge({ usage }: TokenUsageBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant="outline" className="gap-1 font-mono">
        <Coins className="w-3 h-3" />
        {formatCost(usage.cost)}
      </Badge>
    </div>
  );
}

interface SessionStatsBarProps {
  stats: SessionStats;
}

export function SessionStatsBar({ stats }: SessionStatsBarProps) {
  if (stats.generationCount === 0) return null;

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-muted/50 border-b text-xs text-muted-foreground overflow-x-auto">
      <span className="flex items-center gap-1 shrink-0">
        <Zap className="w-3 h-3" />
        <span className="font-medium">{stats.generationCount}</span> <span className="hidden sm:inline">generaciones</span><span className="sm:hidden">gen</span>
      </span>
      <span className="text-border shrink-0">|</span>
      <span className="flex items-center gap-1 font-medium shrink-0">
        <Coins className="w-3 h-3" />
        {formatCost(stats.totalCost)}
      </span>
    </div>
  );
}
