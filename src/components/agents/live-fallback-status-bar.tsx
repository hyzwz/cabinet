"use client";

import { Loader2 } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

interface LiveFallbackStatusBarProps {
  label?: string;
}

export function LiveFallbackStatusBar({ label }: LiveFallbackStatusBarProps) {
  const { t } = useLocale();

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 border-b border-border/70 bg-background/95 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-sm">
      <Loader2 className="h-3 w-3 animate-spin text-primary" />
      <span>{label ?? t("agents.history.checkingTranscript")}</span>
    </div>
  );
}
