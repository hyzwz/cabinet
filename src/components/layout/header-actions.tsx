"use client";

import { Sparkles, Search, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIPanelStore } from "@/stores/ai-panel-store";
import { useAppStore } from "@/stores/app-store";
import { ThemePicker } from "@/components/layout/theme-picker";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { UserMenu } from "@/components/auth/user-menu";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

/**
 * Global header actions shared across all file-type toolbars:
 * Search, Terminal toggle, AI panel toggle, Theme picker.
 */
export function HeaderActions() {
  const { isOpen, toggle } = useAIPanelStore();
  const { terminalOpen, toggleTerminal } = useAppStore();
  const { t } = useLocale();

  return (
    <>
      {/* Search hint */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground hidden sm:flex"
        onClick={() => {
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true })
          );
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span>{t("header.searchHint")}</span>
        <kbd className="pointer-events-none text-[10px] font-mono bg-muted px-1 py-0.5 rounded">
          ⌘K
        </kbd>
      </Button>

      {/* Terminal toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", terminalOpen && "text-primary")}
        onClick={toggleTerminal}
      >
        <Terminal className="h-4 w-4" />
      </Button>

      {/* AI toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", isOpen && "text-primary")}
        onClick={toggle}
      >
        <Sparkles className="h-4 w-4" />
      </Button>

      {/* Language switcher */}
      <LanguageSwitcher />

      {/* Theme picker */}
      <ThemePicker />

      {/* User menu */}
      <UserMenu />
    </>
  );
}
