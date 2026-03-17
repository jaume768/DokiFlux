"use client";

import { Badge } from "@/components/ui/badge";
import { formatCost, formatTokens } from "@/lib/pricing";
import { TokenUsage as TokenUsageType, SessionStats } from "@/types";
import { Coins, Zap } from "lucide-react";

interface TokenUsageBadgeProps {
  usage: TokenUsageType;
}

export function TokenUsageBadge({ usage }: TokenUsageBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant="secondary" className="gap-1 font-mono">
        <Zap className="w-3 h-3" />
        {formatTokens(usage.inputTokens)} in / {formatTokens(usage.outputTokens)} out
      </Badge>
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
    <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Zap className="w-3 h-3" />
        <span className="font-medium">{stats.generationCount}</span> generaciones
      </span>
      <span className="text-border">|</span>
      <span>
        {formatTokens(stats.totalInputTokens)} in / {formatTokens(stats.totalOutputTokens)} out
      </span>
      <span className="text-border">|</span>
      <span className="flex items-center gap-1 font-medium">
        <Coins className="w-3 h-3" />
        {formatCost(stats.totalCost)} total
      </span>
    </div>
  );
}
