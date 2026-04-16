"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UpdateSummary } from "@/components/system/update-summary";
import { useLocale } from "@/components/i18n/locale-provider";
import type { UpdateCheckResult } from "@/types";

interface UpdateDialogProps {
  open: boolean;
  update: UpdateCheckResult | null;
  refreshing: boolean;
  applyPending: boolean;
  backupPending: boolean;
  backupPath: string | null;
  actionError: string | null;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onApply: () => Promise<void>;
  onCreateBackup: () => Promise<void>;
  onOpenDataDir: () => Promise<void>;
  onLater: () => void;
}

export function UpdateDialog({
  open,
  update,
  refreshing,
  applyPending,
  backupPending,
  backupPath,
  actionError,
  onOpenChange,
  onRefresh,
  onApply,
  onCreateBackup,
  onOpenDataDir,
  onLater,
}: UpdateDialogProps) {
  const { t, format } = useLocale();
  if (!update) return null;

  const latestVersion = update.latest?.version;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="gap-2">
          <DialogTitle>
            {update.updateStatus.state === "restart-required"
              ? t("layout.update.restartTitle")
              : latestVersion && update.updateAvailable
                ? format("layout.update.availableTitle", { version: latestVersion })
                : t("layout.update.title")}
          </DialogTitle>
          <DialogDescription>
            {t("layout.update.description")}
          </DialogDescription>
        </DialogHeader>

        <UpdateSummary
          update={update}
          refreshing={refreshing}
          applyPending={applyPending}
          backupPending={backupPending}
          backupPath={backupPath}
          actionError={actionError}
          onRefresh={onRefresh}
          onApply={onApply}
          onCreateBackup={onCreateBackup}
          onOpenDataDir={onOpenDataDir}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onLater}>
            {t("layout.update.later")}
          </Button>
          {update.latestReleaseNotesUrl && (
            <Button
              variant="ghost"
              render={
                <a
                  href={update.latestReleaseNotesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              {t("layout.update.releaseNotes")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
