"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { LegacyHeartbeatFallbackCard } from "@/components/agents/legacy-heartbeat-fallback-card";
import { LegacyHistorySectionHeader } from "@/components/agents/legacy-history-section-header";
import type { HeartbeatRecord } from "@/lib/agents/persona-manager";

interface LegacyHeartbeatSectionProps {
  records: HeartbeatRecord[];
  hiddenCount?: number;
  expandedKeys: Set<string>;
  onToggle: (key: string) => void;
  summaryPreviewLines?: number;
  className?: string;
  summaryLabel?: {
    visible: number;
    hidden: number;
  } | null;
  collapsedCount?: number;
}

export function LegacyHeartbeatSection({
  records,
  hiddenCount = 0,
  expandedKeys,
  onToggle,
  summaryPreviewLines = 2,
  className,
  summaryLabel = null,
  collapsedCount = 0,
}: LegacyHeartbeatSectionProps) {
  const { format } = useLocale();

  if (records.length === 0) return null;

  return (
    <div className={className ?? "space-y-2"}>
      <LegacyHistorySectionHeader hiddenCount={hiddenCount} />
      {summaryLabel ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-background/10 px-3 py-2 text-[11px] text-muted-foreground/60">
          {format("agents.history.showingLegacy", {
            visible: summaryLabel.visible,
            hidden: summaryLabel.hidden,
          })}
        </div>
      ) : null}
      {records.map((record) => (
        <LegacyHeartbeatFallbackCard
          key={record.timestamp}
          record={record}
          expanded={expandedKeys.has(record.timestamp)}
          onToggle={() => onToggle(record.timestamp)}
          summaryPreviewLines={summaryPreviewLines}
        />
      ))}
    </div>
  );
}
