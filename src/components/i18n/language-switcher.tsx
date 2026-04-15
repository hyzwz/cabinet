"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale } from "@/components/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/messages";

const LOCALE_OPTIONS: Locale[] = ["zh", "en"];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("locale.switcher.ariaLabel")}>
            <Languages className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-32">
        {LOCALE_OPTIONS.map((option) => (
          <DropdownMenuItem key={option} onClick={() => setLocale(option)}>
            <span className="flex-1">{t(`locale.${option}`)}</span>
            {locale === option ? <span className="text-xs text-muted-foreground">✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
