"use client";

import { LogOut, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useLocale } from "@/components/i18n/locale-provider";

export function UserMenu() {
  const { user, authMode, logout } = useAuthStore();
  const { t: _t } = useLocale();

  // Only show in multi-user mode
  if (authMode !== "multi" || !user) return null;

  const initials = (user.displayName || user.username)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground">
        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
          {initials}
        </div>
        <span className="hidden sm:inline max-w-[80px] truncate">
          {user.displayName || user.username}
        </span>
        {user.role === "admin" && (
          <Shield className="h-3 w-3 text-amber-500" />
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={logout}
        title="Logout"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
