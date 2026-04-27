"use client";

import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { HeartbeatRecord } from "@/lib/agents/persona-manager";

interface LegacyHeartbeatFallbackCardProps {
  record: HeartbeatRecord;
  expanded: boolean;
  onToggle: () => void;
  summaryPreviewLines?: number;
  className?: string;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function LegacyHeartbeatFallbackCard({
  record,
  expanded,
  onToggle,
  summaryPreviewLines = 3,
  className,
}: LegacyHeartbeatFallbackCardProps) {
  const { t } = useLocale();
  const hasSummary = typeof record.summary === "string" && record.summary.trim().length > 0;

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border/70 bg-background/40", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-accent/30"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border/80 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              {t("agents.history.legacySummary")}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            {t("agents.history.legacySummaryPreview")}
          </p>
          {hasSummary ? (
            <div
              className="mt-2 text-[11px] leading-relaxed text-foreground/85"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: expanded ? "unset" : String(summaryPreviewLines),
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {record.summary}
            </div>
          ) : null}
        </div>
        {expanded ? (
          <ChevronDown className="mt-0.5 h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="mt-0.5 h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded ? (
        <div className="border-t border-border/70 bg-background">
          {hasSummary ? (
            <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-foreground/85">
              {record.summary}
            </pre>
          ) : (
            <div className="px-3 py-4 text-[11px] text-muted-foreground/70">
              {t("agents.history.noTranscriptCaptured")}
            </div>
          )}
          <div className="flex items-center gap-3 border-t border-border/70 px-3 py-1.5 text-[10px] text-muted-foreground/60">
            <Clock className="h-2.5 w-2.5 inline mr-0.5" />
            {formatDuration(record.duration)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
