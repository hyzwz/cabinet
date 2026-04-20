"use client";

import { Lock, Unlock } from "lucide-react";
import { useCollaborationStore } from "@/stores/collaboration-store";
import { useLocale } from "@/components/i18n/locale-provider";

export function LockBanner() {
  const { lockStatus, lockInfo } = useCollaborationStore();
  const { t } = useLocale();

  if (lockStatus !== "locked_by_other" || !lockInfo) return null;

  const lockedBy = lockInfo.username;
  const lockedAt = new Date(lockInfo.acquired_at).toLocaleTimeString();

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-[13px]">
      <Lock className="h-3.5 w-3.5 flex-shrink-0" />
      <span>
        {t("editor.lockedBy")
          .replace("{user}", lockedBy)
          .replace("{time}", lockedAt)}
      </span>
    </div>
  );
}

export function LockIndicator() {
  const { lockStatus } = useCollaborationStore();

  if (lockStatus === "idle" || lockStatus === "acquiring") return null;

  return lockStatus === "locked_by_me" ? (
    <Unlock className="h-3 w-3 text-green-500" />
  ) : (
    <Lock className="h-3 w-3 text-amber-500" />
  );
}
