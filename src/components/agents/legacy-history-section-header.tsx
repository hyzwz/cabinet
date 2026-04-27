"use client";

import { useLocale } from "@/components/i18n/locale-provider";

interface LegacyHistorySectionHeaderProps {
  hiddenCount?: number;
}

export function LegacyHistorySectionHeader({ hiddenCount = 0 }: LegacyHistorySectionHeaderProps) {
  const { t, format } = useLocale();

  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {t("agents.history.legacySummary")}
      </div>
      {hiddenCount > 0 ? (
        <div className="text-[10px] text-muted-foreground/60">
          {format("agents.history.moreLegacyHidden", {
            count: hiddenCount,
          })}
        </div>
      ) : null}
    </div>
  );
}
