"use client";

import { AlertTriangle, CloudDownload, FolderOpen, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import type { UpdateCheckResult } from "@/types";

interface UpdateSummaryProps {
  update: UpdateCheckResult;
  loading?: boolean;
  refreshing?: boolean;
  applyPending?: boolean;
  backupPending?: boolean;
  backupPath?: string | null;
  actionError?: string | null;
  onRefresh: () => void;
  onApply: () => Promise<void> | void;
  onCreateBackup: () => Promise<void> | void;
  onOpenDataDir: () => Promise<void> | void;
}

function statusLabel(update: UpdateCheckResult, t: ReturnType<typeof useLocale>["t"]): string {
  const state = update.updateStatus.state;
  if (state === "restart-required") return t("layout.update.summary.status.restartRequired");
  if (state === "failed") return t("layout.update.summary.status.failed");
  if (state === "starting") return t("layout.update.summary.status.starting");
  if (state === "backing-up") return t("layout.update.summary.status.backingUp");
  if (state === "downloading") return t("layout.update.summary.status.downloading");
  if (state === "applying") return t("layout.update.summary.status.applying");
  if (update.updateAvailable) return t("layout.update.summary.status.available");
  return t("layout.update.summary.status.upToDate");
}

export function UpdateSummary({
  update,
  loading,
  refreshing,
  applyPending,
  backupPending,
  backupPath,
  actionError,
  onRefresh,
  onApply,
  onCreateBackup,
  onOpenDataDir,
}: UpdateSummaryProps) {
  const { t, format } = useLocale();
  const state = update.updateStatus.state;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CloudDownload className="h-4 w-4" />
            <h3 className="text-sm font-semibold">{t("layout.update.summary.title")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {format("layout.update.summary.currentVersion", { version: update.current.version })}
            {update.latest
              ? ` • ${format("layout.update.summary.latestVersion", { version: update.latest.version })}`
              : ""}
            {` • ${update.installKind}`}
          </p>
        </div>
        <div className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {loading ? t("layout.update.summary.status.checking") : statusLabel(update, t)}
        </div>
      </div>

      <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-background/60 p-3">
          <p className="font-medium text-foreground">{t("layout.update.summary.dataDirectory")}</p>
          <p className="mt-1 break-all font-mono text-[11px]">{update.dataDir}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/60 p-3">
          <p className="font-medium text-foreground">{t("layout.update.summary.backups")}</p>
          <p className="mt-1 break-all font-mono text-[11px]">{update.backupRoot}</p>
        </div>
      </div>

      {update.updateAvailable && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              {t("layout.update.summary.warning")}
            </p>
          </div>
        </div>
      )}

      {update.instructions.length > 0 && (
        <div className="space-y-2">
          {update.instructions.map((instruction) => (
            <p key={instruction} className="text-xs text-muted-foreground">
              {instruction}
            </p>
          ))}
        </div>
      )}

      {update.dirtyAppFiles.length > 0 && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">
          <p className="font-medium">{t("layout.update.summary.localChanges")}</p>
          <p className="mt-1 break-all font-mono text-[11px]">
            {update.dirtyAppFiles.slice(0, 8).join(", ")}
            {update.dirtyAppFiles.length > 8 ? ` +${update.dirtyAppFiles.length - 8} more` : ""}
          </p>
        </div>
      )}

      {(update.updateStatus.message || update.updateStatus.error || backupPath || actionError) && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {update.updateStatus.message && <p>{update.updateStatus.message}</p>}
          {update.updateStatus.backupPath && (
            <p className="break-all font-mono text-[11px]">
              {format("layout.update.summary.backup", { path: update.updateStatus.backupPath })}
            </p>
          )}
          {backupPath && (
            <p className="break-all font-mono text-[11px]">
              {format("layout.update.summary.latestBackup", { path: backupPath })}
            </p>
          )}
          {update.updateStatus.error && <p className="text-destructive">{update.updateStatus.error}</p>}
          {actionError && <p className="text-destructive">{actionError}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-[12px]"
          onClick={() => {
            onRefresh();
          }}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {t("layout.update.summary.checkNow")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-[12px]"
          onClick={() => {
            void onOpenDataDir();
          }}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          {t("layout.update.summary.openDataFolder")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-[12px]"
          onClick={() => {
            void onCreateBackup();
          }}
          disabled={backupPending}
        >
          {backupPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudDownload className="h-3.5 w-3.5" />}
          {t("layout.update.summary.createBackupCopy")}
        </Button>
        {update.canApplyUpdate && state !== "restart-required" && (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
            onClick={() => {
              void onApply();
            }}
            disabled={applyPending}
          >
            {applyPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudDownload className="h-3.5 w-3.5" />}
            {t("layout.update.summary.updateNow")}
          </Button>
        )}
      </div>
    </div>
  );
}
