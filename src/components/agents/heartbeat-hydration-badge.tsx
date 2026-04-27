"use client";

import { AlertCircle, CheckCircle2, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeartbeatHydrationStats } from "@/lib/agents/persona-manager";

export function HeartbeatHydrationBadge({
  hydration,
  className,
  compact = false,
}: {
  hydration: HeartbeatHydrationStats | null;
  className?: string;
  compact?: boolean;
}) {
  if (!hydration || hydration.total === 0) return null;

  return (
    <div
      className={cn(
        compact
          ? "rounded-md border border-border/50 bg-muted/5 px-2 py-1.5 text-[10px] text-muted-foreground/70"
          : "rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground/70",
        className
      )}
    >
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", compact && "gap-x-2") }>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className={cn("text-emerald-500", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          Hydrated {hydration.hydrated}/{hydration.withConversationId}
        </span>
        {hydration.missingMeta > 0 ? (
          <span className="inline-flex items-center gap-1">
            <AlertCircle className={cn("text-amber-500", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
            {hydration.missingMeta} waiting on transcript metadata
          </span>
        ) : null}
        {hydration.missingConversationId > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Link2Off className={cn("text-muted-foreground/70", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
            {hydration.missingConversationId} legacy records without conversation ids
          </span>
        ) : null}
      </div>
    </div>
  );
}
