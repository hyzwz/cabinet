import { ArrowUpRight, Hand, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  CabinetReportingLinkView,
  CabinetReportingSnapshotView,
} from "@/types/cabinets";
import type { CabinetReportingLinkStatus } from "@/lib/auth/reporting";
import {
  getReportingSnapshotAgeMs,
  isReportingSnapshotStale,
  formatReportingStatusTone,
  formatReportingVisibilityTone,
} from "./reporting-helpers";
import type {
  ReportingFreshnessFilter,
  ReportingHealthScope,
  ReportingSnapshotFilter,
} from "./reporting-helpers";

function formatReportingTime(value?: string | null) {
  if (!value) return "unknown";

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;

  const ageMs = Date.now() - timestamp;
  if (!Number.isFinite(ageMs) || ageMs < 0) return "just now";

  const minutes = Math.floor(ageMs / (1000 * 60));
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (days >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (minutes >= 1) return `${minutes}m ago`;
  return "just now";
}

function formatReportingDateTime(value?: string | null) {
  if (!value) return "unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function formatRelativeTime(value?: string | null) {
  return formatReportingTime(value);
}

function formatReportingMissingStateLabel(updatedAt?: string | null, status?: CabinetReportingLinkStatus) {
  if (status && status !== "active") {
    return `missing with ${status} status`;
  }

  const ageMs = updatedAt ? Date.now() - Date.parse(updatedAt) : Number.NaN;
  if (Number.isFinite(ageMs)) {
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays >= 30) return `missing for 30d+ · ${status ?? "active"}`;
    if (ageDays >= 14) return `missing for 14d+ · ${status ?? "active"}`;
    if (ageDays >= 7) return `missing for 7d+ · ${status ?? "active"}`;
    if (ageDays >= 3) return `missing for 3d+ · ${status ?? "active"}`;
    if (ageDays >= 1) return `missing for 1d+ · ${status ?? "active"}`;
    if (ageDays >= 0) return `missing after recent update · ${status ?? "active"}`;
  }

  return `missing state unknown · ${status ?? "active"}`;
}

function formatReportingMissingSeverityLabel(updatedAt?: string | null, status?: CabinetReportingLinkStatus) {
  if (status && status !== "active") {
    return `watch ${status}`;
  }

  const ageMs = updatedAt ? Date.now() - Date.parse(updatedAt) : Number.NaN;
  if (Number.isFinite(ageMs)) {
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays >= 30) return "severity chronic missing";
    if (ageDays >= 14) return "severity critical missing";
    if (ageDays >= 7) return "severity elevated missing";
    if (ageDays >= 3) return "severity persistent missing";
    if (ageDays >= 1) return "severity sustained drift";
    if (ageDays >= 0) return "severity recent drift";
  }

  return "missing severity unknown";
}

function formatReportingSnapshotFreshnessLabel(generatedAt?: string | null) {
  if (!generatedAt) return "freshness unknown";

  const ageMs = Date.now() - Date.parse(generatedAt);
  if (!Number.isFinite(ageMs)) return "freshness unknown";

  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays >= 7) return "stale for 7d+";
  if (ageDays >= 3) return "stale for 3d+";
  if (ageDays >= 1) return "stale for 1d+";
  return "fresh";
}

function formatRefreshStatus(lastUpdatedAt?: string | null) {
  if (!lastUpdatedAt) return null;
  return `Last refreshed ${formatReportingTime(lastUpdatedAt)} · ${formatReportingDateTime(lastUpdatedAt)}`;
}

type RefreshStatusChipVariant = "loading" | "success";

function ReportingRefreshStatusChip({
  variant,
  message,
}: {
  variant: RefreshStatusChipVariant;
  message?: string | null;
}) {
  const tone =
    variant === "loading"
      ? formatRefreshActivityTone(message)
      : formatRefreshFeedbackBadgeTone(message);
  const sourceLabel = formatRefreshSourceLabel(message);
  const SourceIcon = formatRefreshSourceIcon(message);
  const iconPrefix = formatRefreshSourcePrefix(message);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide shadow-sm transition-colors",
        tone,
      )}
      data-feedback-variant={variant}
      data-feedback-tone={sourceLabel}
      data-feedback-icon={sourceLabel}
    >
      <span className="inline-flex items-center gap-1 rounded-full border border-current/20 bg-background/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-current/80">
        <span aria-hidden="true" className="text-[11px] leading-none">{iconPrefix}</span>
        <SourceIcon className="h-3 w-3" aria-hidden="true" />
        <span>{sourceLabel}</span>
      </span>
      <span className="normal-case tracking-normal">{message ?? (variant === "loading" ? "Refreshing" : "Refreshed just now")}</span>
    </span>
  );
}

function formatRefreshFeedbackTone(message?: string | null) {
  if (!message) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("manually")) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
  if (normalized.includes("review")) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (normalized.includes("opening") || normalized.includes("opened")) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function formatRefreshSourceLabel(message?: string | null) {
  if (!message) return "sync";

  const normalized = message.toLowerCase();
  if (normalized.includes("manually")) return "manual";
  if (normalized.includes("review")) return "review";
  if (normalized.includes("opening") || normalized.includes("opened")) return "open";
  return "sync";
}

function formatRefreshFeedbackBadgeTone(message?: string | null) {
  if (!message) {
    return "border-emerald-500/25 bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/10 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("manually")) {
    return "border-sky-500/25 bg-sky-100 text-sky-700 ring-1 ring-sky-500/10 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
  }
  if (normalized.includes("review")) {
    return "border-amber-500/25 bg-amber-100 text-amber-700 ring-1 ring-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
  if (normalized.includes("opening") || normalized.includes("opened")) {
    return "border-violet-500/25 bg-violet-100 text-violet-700 ring-1 ring-violet-500/10 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300";
  }
  return "border-emerald-500/25 bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/10 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function formatRefreshSourceIcon(message?: string | null) {
  const normalized = (message ?? "").toLowerCase();
  if (normalized.includes("manually")) return Hand;
  if (normalized.includes("review")) return Search;
  if (normalized.includes("opening")) return ArrowUpRight;
  return RefreshCw;
}

function formatRefreshSourcePrefix(message?: string | null) {
  const normalized = (message ?? "").toLowerCase();
  if (normalized.includes("manually")) return "✦";
  if (normalized.includes("review")) return "◉";
  if (normalized.includes("opening")) return "↗";
  return "↻";
}

function formatRefreshActivityTone(message?: string | null) {
  return formatRefreshStatusLabel(message);
}

function formatRefreshStatusLabel(message?: string | null) {

  if (!message) {
    return "border-sky-500/20 bg-sky-100 text-sky-700 ring-1 ring-sky-500/10 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("manually")) {
    return "border-sky-500/20 bg-sky-100 text-sky-700 ring-1 ring-sky-500/10 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
  }
  if (normalized.includes("review")) {
    return "border-amber-500/20 bg-amber-100 text-amber-700 ring-1 ring-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
  if (normalized.includes("opening")) {
    return "border-violet-500/20 bg-violet-100 text-violet-700 ring-1 ring-violet-500/10 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300";
  }
  return "border-sky-500/20 bg-sky-100 text-sky-700 ring-1 ring-sky-500/10 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
}

function formatRefreshFeedbackPanelTone(message?: string | null) {
  if (!message) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 shadow-emerald-500/10 dark:text-emerald-300";
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("manually")) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-700 shadow-sky-500/10 dark:text-sky-300";
  }
  if (normalized.includes("review")) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 shadow-amber-500/10 dark:text-amber-300";
  }
  if (normalized.includes("opening") || normalized.includes("opened")) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-700 shadow-violet-500/10 dark:text-violet-300";
  }
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 shadow-emerald-500/10 dark:text-emerald-300";
}

function formatRefreshActivityPanelTone(message?: string | null) {
  if (!message) {
    return "border-sky-500/20 bg-sky-100 text-sky-700 shadow-sky-500/10 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("manually")) {
    return "border-sky-500/20 bg-sky-100 text-sky-700 shadow-sky-500/10 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
  }
  if (normalized.includes("review")) {
    return "border-amber-500/20 bg-amber-100 text-amber-700 shadow-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
  if (normalized.includes("opening")) {
    return "border-violet-500/20 bg-violet-100 text-violet-700 shadow-violet-500/10 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300";
  }
  return "border-sky-500/20 bg-sky-100 text-sky-700 shadow-sky-500/10 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300";
}

function formatReportingSnapshotAge(value?: string | null) {
  if (!value) return "Unknown snapshot age";
  return `Snapshot age ${formatReportingTime(value)}`;
}

function formatReportingFreshnessTag(value?: string | null) {
  if (!value) return "freshness unknown";

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "freshness unknown";

  const ageHours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
  if (ageHours >= 24 * 7) return "stale for 7d+";
  if (ageHours >= 24 * 3) return "stale for 3d+";
  if (ageHours >= 24) return "stale for 1d+";
  return "fresh";
}

function formatMissingFreshnessTag(value?: string | null, status?: CabinetReportingLinkView["status"]) {
  const normalizedStatus = status ?? "unknown";
  if (normalizedStatus === "paused") return "missing with paused status";
  if (normalizedStatus === "revoked") return "missing with revoked status";
  if (!value) return `missing with ${normalizedStatus} status`;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return `missing with ${normalizedStatus} status`;

  const ageHours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
  if (ageHours >= 24 * 7) return `missing for 7d+ · ${normalizedStatus}`;
  if (ageHours >= 24 * 3) return `missing for 3d+ · ${normalizedStatus}`;
  if (ageHours >= 24) return `missing for 1d+ · ${normalizedStatus}`;
  if (ageHours >= 6) return `missing for 6h+ · ${normalizedStatus}`;
  return `missing after recent update · ${normalizedStatus}`;
}

function formatMissingSeverityTag(value?: string | null, status?: CabinetReportingLinkView["status"]) {
  const normalizedStatus = status ?? "unknown";
  if (normalizedStatus === "paused") return "severity watch paused";
  if (normalizedStatus === "revoked") return "severity historical revoked";
  if (!value) return `severity unknown · ${normalizedStatus}`;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return `severity unknown · ${normalizedStatus}`;

  const ageHours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
  if (ageHours >= 24 * 7) return "severity critical missing";
  if (ageHours >= 24 * 3) return "severity elevated missing";
  if (ageHours >= 24) return "severity persistent missing";
  if (ageHours >= 6) return "severity watch missing";
  return "severity recent drift";
}

function formatReportingMissingWindowLabel(value?: string | null) {
  if (!value) return "Window unknown";

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Window unknown";

  const ageHours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
  if (ageHours >= 24 * 7) return "Window 7d+ without snapshot";
  if (ageHours >= 24 * 3) return "Window 3d+ without snapshot";
  if (ageHours >= 24) return "Window 1d+ without snapshot";
  if (ageHours >= 6) return "Window 6h+ without snapshot";
  return "Window <6h without snapshot";
}

export function ReportingLinksHeader({
  statusFilter,
  statusCounts,
  isLoading,
  isSaving,
  lastUpdatedAt,
  didJustRefresh,
  refreshNotice,
  refreshActivityLabel,
  onStatusFilterChange,
  onRefresh,
}: {
  statusFilter: "all" | CabinetReportingLinkView["status"];
  statusCounts: { all: number; active: number; paused: number; revoked: number };
  isLoading: boolean;
  isSaving: boolean;
  lastUpdatedAt?: string | null;
  didJustRefresh?: boolean;
  refreshNotice?: string | null;
  refreshActivityLabel?: string | null;
  onStatusFilterChange: (status: "all" | CabinetReportingLinkView["status"]) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-[1.65rem] font-semibold tracking-tight text-foreground">
          Reporting links
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Minimal management surface for linked child cabinets that publish reporting snapshots here.
        </p>
        {isLoading ? (
          <div className="mt-2">
            <ReportingRefreshStatusChip variant="loading" message={refreshActivityLabel} />
          </div>
        ) : didJustRefresh ? (
          <div className="mt-2">
            <ReportingRefreshStatusChip variant="success" message={refreshNotice} />
          </div>
        ) : null}
        {formatRefreshStatus(lastUpdatedAt) ? (
          <p className="mt-2 text-xs text-muted-foreground">{formatRefreshStatus(lastUpdatedAt)}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "paused", "revoked"] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs capitalize"
              onClick={() => onStatusFilterChange(status)}
              disabled={isLoading}
            >
              {status}
              <span className="ml-1.5 text-[11px] text-current/80">{statusCounts[status]}</span>
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onRefresh}
          disabled={isLoading || isSaving || didJustRefresh}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {isLoading ? refreshActivityLabel ?? "Refreshing" : "Refresh links"}
        </Button>
      </div>
    </div>
  );
}

export function ReportingLinksHealthSummary({
  healthSummary,
  healthScope,
  activeHealthState,
  isLoading,
  onScopeChange,
  onHealthySelect,
  onMissingSelect,
  onStaleSelect,
}: {
  healthSummary: { total: number; healthyCount: number; missingCount: number; staleCount: number };
  healthScope: ReportingHealthScope;
  activeHealthState: "healthy" | "missing" | "stale" | null;
  isLoading: boolean;
  onScopeChange: (scope: ReportingHealthScope) => void;
  onHealthySelect: () => void;
  onMissingSelect: () => void;
  onStaleSelect: () => void;
}) {
  if (healthSummary.total <= 0) return null;

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Reporting health scope
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {healthScope === "active"
              ? "Summary is focused on active reporting links."
              : "Summary includes active, paused, and revoked reporting links."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["active", "all"] as const).map((scope) => (
            <Button
              key={scope}
              variant={healthScope === scope ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs capitalize"
              onClick={() => onScopeChange(scope)}
              disabled={isLoading}
            >
              {scope === "active" ? "active only" : "all links"}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <button
          type="button"
          className={cn(
            "rounded-2xl border p-4 text-left transition-colors hover:border-emerald-500/40",
            activeHealthState === "healthy"
              ? "border-emerald-500/40 bg-emerald-500/15 ring-1 ring-emerald-500/20"
              : "border-emerald-500/20 bg-emerald-500/10",
          )}
          onClick={onHealthySelect}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
            Healthy
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{healthSummary.healthyCount}</p>
          <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
            {healthScope === "active"
              ? "Active links with a current snapshot published within the last 24 hours."
              : "Links with a current snapshot published within the last 24 hours."}
          </p>
        </button>
        <button
          type="button"
          className={cn(
            "rounded-2xl border p-4 text-left transition-colors hover:border-amber-500/40",
            activeHealthState === "missing"
              ? "border-amber-500/40 bg-amber-500/15 ring-1 ring-amber-500/20"
              : "border-amber-500/20 bg-amber-500/10",
          )}
          onClick={onMissingSelect}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
            Missing
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{healthSummary.missingCount}</p>
          <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">
            {healthScope === "active"
              ? "Active links that do not currently have any reporting snapshot available."
              : "Links that do not currently have any reporting snapshot available."}
          </p>
        </button>
        <button
          type="button"
          className={cn(
            "rounded-2xl border p-4 text-left transition-colors hover:border-violet-500/40",
            activeHealthState === "stale"
              ? "border-violet-500/40 bg-violet-500/15 ring-1 ring-violet-500/20"
              : "border-violet-500/20 bg-violet-500/10",
          )}
          onClick={onStaleSelect}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">
            Stale
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{healthSummary.staleCount}</p>
          <p className="mt-2 text-sm text-violet-900/80 dark:text-violet-100/80">
            {healthScope === "active"
              ? "Active links whose latest snapshot is older than 24 hours and may need refresh attention."
              : "Links whose latest snapshot is older than 24 hours and may need refresh attention."}
          </p>
        </button>
      </div>
    </div>
  );
}

export function ReportingLinksAlerts({
  activeLinksMissingSnapshots,
  staleLinkedSnapshots,
  linkedSnapshots,
  isLoading,
  isRefreshingMissingReview,
  isRefreshingAndOpeningMissing,
  isRefreshingStaleReview,
  isRefreshingAndOpeningStale,
  onOpenChildCabinet,
  onReviewMissing,
  onReviewStale,
  onRefreshAndReviewMissing,
  onRefreshAndReviewStale,
  onRefreshAndOpenMissing,
  onRefreshAndOpenStale,
  missingOpenCompletionNotice,
  staleOpenCompletionNotice,
}: {
  activeLinksMissingSnapshots: CabinetReportingLinkView[];
  staleLinkedSnapshots: CabinetReportingLinkView[];
  linkedSnapshots: Map<string, CabinetReportingSnapshotView>;
  isLoading: boolean;
  isRefreshingMissingReview?: boolean;
  isRefreshingAndOpeningMissing?: boolean;
  isRefreshingStaleReview?: boolean;
  isRefreshingAndOpeningStale?: boolean;
  onOpenChildCabinet: (childCabinetId: string) => void;
  onReviewMissing: () => void;
  onReviewStale: () => void;
  onRefreshAndReviewMissing?: () => void;
  onRefreshAndReviewStale?: () => void;
  onRefreshAndOpenMissing?: () => void;
  onRefreshAndOpenStale?: () => void;
  missingOpenCompletionNotice?: string | null;
  staleOpenCompletionNotice?: string | null;
}) {
  const missingOpenButtonLabel = missingOpenCompletionNotice ?? "Refresh and open cabinet";
  const staleOpenButtonLabel = staleOpenCompletionNotice ?? "Refresh and open cabinet";

  return (
    <>
      {activeLinksMissingSnapshots.length > 0 ? (
        <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-amber-800 dark:text-amber-200">
                Attention needed
              </p>
              <h3 className="mt-1 text-base font-semibold text-foreground">
                Active reporting links without snapshots
              </h3>
              <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                These active links are expected to publish reporting snapshots but do not currently have one. Refresh reporting or inspect the child cabinets below.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-amber-500/30 bg-background/70"
                onClick={onReviewMissing}
                disabled={isLoading}
              >
                Review active missing links
              </Button>
              {onRefreshAndReviewMissing ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-amber-500/30 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-100"
                  onClick={onRefreshAndReviewMissing}
                  disabled={isLoading}
                >
                  {isRefreshingMissingReview ? "Refreshing before missing review..." : "Refresh then review"}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-amber-900 hover:text-amber-950 dark:text-amber-100 dark:hover:text-amber-50"
                onClick={() => onOpenChildCabinet(activeLinksMissingSnapshots[0]?.childCabinetId ?? "")}
                disabled={isLoading || !activeLinksMissingSnapshots[0]}
              >
                Open first affected cabinet
              </Button>
              {onRefreshAndOpenMissing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-amber-900 hover:text-amber-950 dark:text-amber-100 dark:hover:text-amber-50"
                  onClick={onRefreshAndOpenMissing}
                  disabled={isLoading || !activeLinksMissingSnapshots[0] || isRefreshingAndOpeningMissing}
                >
                  {isRefreshingAndOpeningMissing
                    ? "Refreshing and opening cabinet..."
                    : missingOpenButtonLabel}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {activeLinksMissingSnapshots.slice(0, 4).map((link) => (
              <button
                key={link.id}
                type="button"
                className="rounded-xl border border-amber-500/20 bg-background/80 px-4 py-3 text-left transition-colors hover:border-amber-500/40"
                onClick={() => onOpenChildCabinet(link.childCabinetId)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{link.childCabinetId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Link ID: {link.id}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                </div>
                <div className="mt-2 space-y-1 text-left">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    <span>Updated {formatReportingDateTime(link.updatedAt)}</span>
                    <span>{formatReportingMissingWindowLabel(link.updatedAt)}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Last change {formatRelativeTime(link.updatedAt)} · Status {link.status}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Missing state {formatReportingMissingStateLabel(link.updatedAt, link.status)}
                  </div>
                  <div className="text-xs text-amber-300">
                    Severity {formatReportingMissingSeverityLabel(link.updatedAt, link.status)}
                  </div>
                  <div className="text-xs text-zinc-500">Created by {link.createdBy}</div>
                </div>
              </button>
            ))}
          </div>
          {activeLinksMissingSnapshots.length > 4 ? (
            <p className="mt-3 text-xs text-amber-900/80 dark:text-amber-100/80">
              {activeLinksMissingSnapshots.length - 4} more active links are missing snapshots. Use the quick filter above to review the full list.
            </p>
          ) : null}
        </div>
      ) : null}

      {staleLinkedSnapshots.length > 0 ? (
        <div className="mb-5 rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-violet-800 dark:text-violet-200">
                Freshness warning
              </p>
              <h3 className="mt-1 text-base font-semibold text-foreground">
                Reporting links with stale snapshots
              </h3>
              <p className="mt-1 text-sm text-violet-900/80 dark:text-violet-100/80">
                These links have snapshots, but the latest published data is older than 24 hours. Review the linked cabinets or trigger a reporting refresh.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-violet-500/30 bg-background/70"
                onClick={onReviewStale}
                disabled={isLoading}
              >
                Review stale links
              </Button>
              {onRefreshAndReviewStale ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-violet-500/30 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-100"
                  onClick={onRefreshAndReviewStale}
                  disabled={isLoading}
                >
                  {isRefreshingStaleReview ? "Refreshing before stale review..." : "Refresh then review"}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-violet-900 hover:text-violet-950 dark:text-violet-100 dark:hover:text-violet-50"
                onClick={() => onOpenChildCabinet(staleLinkedSnapshots[0]?.childCabinetId ?? "")}
                disabled={isLoading || !staleLinkedSnapshots[0]}
              >
                Open first stale cabinet
              </Button>
              {onRefreshAndOpenStale ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-violet-900 hover:text-violet-950 dark:text-violet-100 dark:hover:text-violet-50"
                  onClick={onRefreshAndOpenStale}
                  disabled={isLoading || !staleLinkedSnapshots[0] || isRefreshingAndOpeningStale}
                >
                  {isRefreshingAndOpeningStale
                    ? "Refreshing and opening cabinet..."
                    : staleOpenButtonLabel}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {staleLinkedSnapshots.slice(0, 4).map((link) => {
              const snapshot = linkedSnapshots.get(link.childCabinetId);
              if (!snapshot) return null;

              return (
                <button
                  key={link.id}
                  type="button"
                  className="rounded-xl border border-violet-500/20 bg-background/80 px-4 py-3 text-left transition-colors hover:border-violet-500/40"
                  onClick={() => onOpenChildCabinet(link.childCabinetId)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{link.childCabinetId}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatReportingDateTime(snapshot.generatedAt)}</p>
                    </div>
                    <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                      stale
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-violet-900/80 dark:text-violet-100/80">
                    Last snapshot {formatReportingTime(snapshot.generatedAt)} · {snapshot.summary.cabinetPath}
                  </p>
                  <p className="mt-1 text-xs text-violet-900/75 dark:text-violet-100/75">
                    Generated {formatReportingDateTime(snapshot.generatedAt)} · {formatReportingSnapshotAge(snapshot.generatedAt)}
                  </p>
                  <p className="mt-1 text-xs text-violet-900/75 dark:text-violet-100/75">
                    Freshness {formatReportingFreshnessTag(snapshot.generatedAt)} · {snapshot.summary.itemCount} items · {snapshot.summary.activeAgentCount} agents · {snapshot.summary.enabledJobCount} jobs
                  </p>
                </button>
              );
            })}
          </div>
          {staleLinkedSnapshots.length > 4 ? (
            <p className="mt-3 text-xs text-violet-900/80 dark:text-violet-100/80">
              {staleLinkedSnapshots.length - 4} more links have stale snapshots. Review the grouped list below for the full set.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function ReportingLinksFilters({
  scopeParentCabinetId,
  isScopeAligned,
  snapshotFilter,
  freshnessFilter,
  snapshotCounts,
  freshnessCounts,
  newChildCabinetId,
  isLoading,
  isSaving,
  onSnapshotFilterChange,
  onFreshnessFilterChange,
  onNewChildCabinetIdChange,
  onCreateLink,
}: {
  scopeParentCabinetId: string;
  isScopeAligned: boolean;
  snapshotFilter: ReportingSnapshotFilter;
  freshnessFilter: ReportingFreshnessFilter;
  snapshotCounts: { all: number; present: number; missing: number };
  freshnessCounts: { all: number; fresh: number; stale: number };
  newChildCabinetId: string;
  isLoading: boolean;
  isSaving: boolean;
  onSnapshotFilterChange: (filter: ReportingSnapshotFilter) => void;
  onFreshnessFilterChange: (filter: ReportingFreshnessFilter) => void;
  onNewChildCabinetIdChange: (value: string) => void;
  onCreateLink: () => void;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/80 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Snapshot coverage
        </p>
        {(["all", "present", "missing"] as const).map((filter) => (
          <Button
            key={filter}
            variant={snapshotFilter === filter ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs capitalize"
            onClick={() => onSnapshotFilterChange(filter)}
            disabled={isLoading}
          >
            {filter}
            <span className="ml-1.5 text-[11px] text-current/80">{snapshotCounts[filter]}</span>
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Snapshot freshness
        </p>
        {(["all", "fresh", "stale"] as const).map((filter) => (
          <Button
            key={filter}
            variant={freshnessFilter === filter ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs capitalize"
            onClick={() => onFreshnessFilterChange(filter)}
            disabled={isLoading}
          >
            {filter}
            <span className="ml-1.5 text-[11px] text-current/80">{freshnessCounts[filter]}</span>
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Child cabinet path
          </label>
          <input
            value={newChildCabinetId}
            onChange={(event) => onNewChildCabinetIdChange(event.target.value)}
            placeholder={scopeParentCabinetId ? `${scopeParentCabinetId}/child-cabinet` : "example-company/marketing/tiktok"}
            className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/60"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {isScopeAligned
              ? `Add a child cabinet that should publish reporting snapshots into ${scopeParentCabinetId}.`
              : `Link creation is scoped to ${scopeParentCabinetId}. Update the active cabinet view if you meant to manage ${scopeParentCabinetId}.`}
          </p>
        </div>
        <Button className="h-10" onClick={onCreateLink} disabled={isSaving || isLoading || !isScopeAligned}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Add link
        </Button>
      </div>
      {snapshotFilter === "missing" ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          Showing links that do not currently have a reporting snapshot. Active links in this view may require a reporting refresh or follow-up investigation.
        </div>
      ) : null}
      {freshnessFilter === "stale" ? (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-800 dark:text-violet-200">
          Showing links whose latest reporting snapshot is older than 24 hours. These links may need refresh attention even though snapshot publishing has succeeded.
        </div>
      ) : null}
    </div>
  );
}

export function ReportingLinksFeedback({
  error,
  isLoading,
  totalLinks,
  filteredLinksCount,
  statusFilter,
  snapshotFilter,
  freshnessFilter,
}: {
  error: string | null;
  isLoading: boolean;
  totalLinks: number;
  filteredLinksCount: number;
  statusFilter: "all" | CabinetReportingLinkView["status"];
  snapshotFilter: ReportingSnapshotFilter;
  freshnessFilter: ReportingFreshnessFilter;
}) {
  if (error) {
    return (
      <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (isLoading || filteredLinksCount > 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-background/60 px-4 py-6 text-sm text-muted-foreground">
      {totalLinks === 0
        ? "No reporting links configured for this cabinet."
        : statusFilter !== "all" && snapshotFilter !== "all" && freshnessFilter !== "all"
          ? `No ${statusFilter} reporting links with ${snapshotFilter} snapshots and ${freshnessFilter} freshness match the current filters.`
          : statusFilter !== "all" && snapshotFilter !== "all"
            ? `No ${statusFilter} reporting links with ${snapshotFilter} snapshots match the current filters.`
            : statusFilter !== "all" && freshnessFilter !== "all"
              ? `No ${statusFilter} reporting links with ${freshnessFilter} snapshots match the current filters.`
              : snapshotFilter !== "all" && freshnessFilter !== "all"
                ? `No reporting links with ${snapshotFilter} snapshots and ${freshnessFilter} freshness match the current filters.`
                : statusFilter !== "all"
                  ? `No ${statusFilter} reporting links match the current filter.`
                  : snapshotFilter !== "all"
                    ? `No reporting links with ${snapshotFilter} snapshots match the current filter.`
                    : freshnessFilter !== "all"
                      ? `No reporting links with ${freshnessFilter} snapshots match the current filter.`
                      : "No reporting links match the current filters."}
    </div>
  );
}

function ReportingLinkSnapshotSummary({
  linkedSnapshot,
  snapshotIsStale,
  isRevoked,
  linkStatus,
}: {
  linkedSnapshot?: CabinetReportingSnapshotView;
  snapshotIsStale: boolean;
  isRevoked: boolean;
  linkStatus: CabinetReportingLinkView["status"];
}) {
  return (
    <div className={cn("mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4", isRevoked && "bg-muted/10")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Latest snapshot
          </p>
          <p className={cn("mt-1 text-sm font-medium text-foreground", isRevoked && "text-muted-foreground")}>
            {linkedSnapshot
              ? linkedSnapshot.summary.visibleCabinetNames[0] ?? linkedSnapshot.summary.childCabinetNames[0] ?? linkedSnapshot.summary.cabinetPath
              : "No snapshot yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {linkedSnapshot
              ? `${formatReportingTime(linkedSnapshot.generatedAt)} · ${formatReportingDateTime(linkedSnapshot.generatedAt)}`
              : linkStatus === "active"
                ? "Snapshot will appear after the next reporting refresh."
                : "Inactive links do not currently publish snapshots."}
          </p>
          {snapshotIsStale ? (
            <p className="mt-2 text-xs text-violet-700 dark:text-violet-300">
              This snapshot is older than 24 hours and may no longer reflect the current child cabinet state.
            </p>
          ) : null}
        </div>
        {linkedSnapshot ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {snapshotIsStale ? (
              <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                stale
              </span>
            ) : null}
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${formatReportingVisibilityTone(linkedSnapshot.summary.visibility)}`}>
              {linkedSnapshot.summary.visibility}
            </span>
          </div>
        ) : null}
      </div>

      {linkedSnapshot ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Items</p>
              <p className="mt-1 text-base font-semibold text-foreground">{linkedSnapshot.summary.itemCount}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Agents</p>
              <p className="mt-1 text-base font-semibold text-foreground">{linkedSnapshot.summary.activeAgentCount}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Jobs</p>
              <p className="mt-1 text-base font-semibold text-foreground">{linkedSnapshot.summary.enabledJobCount}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Children</p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {linkedSnapshot.summary.visibleChildrenCount}/{linkedSnapshot.summary.totalChildrenCount}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between gap-3">
              <dt>Snapshot cabinet path</dt>
              <dd className="text-right text-foreground">{linkedSnapshot.summary.cabinetPath}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Visible descendants</dt>
              <dd className="text-right text-foreground">{linkedSnapshot.summary.visibleChildrenCount}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </div>
  );
}

function ReportingLinkCard({
  link,
  linkedSnapshot,
  isLoading,
  isSaving,
  onOpenChildCabinet,
  onUpdateLinkStatus,
}: {
  link: CabinetReportingLinkView;
  linkedSnapshot?: CabinetReportingSnapshotView;
  isLoading: boolean;
  isSaving: boolean;
  onOpenChildCabinet: (childCabinetId: string) => void;
  onUpdateLinkStatus: (linkId: string, status: CabinetReportingLinkView["status"]) => void;
}) {
  const snapshotIsStale = Boolean(linkedSnapshot && isReportingSnapshotStale(linkedSnapshot.generatedAt));
  const isRevoked = link.status === "revoked";

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/70 bg-background/85 p-5 shadow-sm transition-opacity",
        isRevoked && "border-border/50 bg-muted/20 opacity-70",
        snapshotIsStale && !isRevoked && "border-violet-500/20 bg-violet-500/5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("truncate text-base font-semibold text-foreground", isRevoked && "text-muted-foreground")}>
            {link.childCabinetId}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">Link ID: {link.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChildCabinet(link.childCabinetId)}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Open cabinet
          </Button>
          {snapshotIsStale ? (
            <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
              stale snapshot
            </span>
          ) : null}
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${formatReportingStatusTone(link.status)}`}>
            {link.status}
          </span>
        </div>
      </div>

      {isRevoked ? (
        <div className="mt-4 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
          Revoked links stay visible for audit and history, but they no longer publish reporting snapshots.
        </div>
      ) : null}

      <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex justify-between gap-3">
          <dt>Created by</dt>
          <dd className="text-right text-foreground">{link.createdBy}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Created</dt>
          <dd className="text-right text-foreground">{formatReportingDateTime(link.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Updated</dt>
          <dd className="text-right text-foreground">{formatReportingDateTime(link.updatedAt)}</dd>
        </div>
      </dl>

      <ReportingLinkSnapshotSummary
        linkedSnapshot={linkedSnapshot}
        snapshotIsStale={snapshotIsStale}
        isRevoked={isRevoked}
        linkStatus={link.status}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {(["active", "paused", "revoked"] as const).map((statusOption) => (
          <Button
            key={statusOption}
            variant={link.status === statusOption ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs capitalize"
            onClick={() => onUpdateLinkStatus(link.id, statusOption)}
            disabled={isSaving || isLoading || link.status === statusOption}
          >
            {statusOption}
          </Button>
        ))}
      </div>
    </article>
  );
}

export function ReportingLinksGroupedList({
  groupedLinks,
  linkedSnapshots,
  filteredLinks,
  isLoading,
  isSaving,
  onOpenChildCabinet,
  onUpdateLinkStatus,
}: {
  groupedLinks: {
    active: CabinetReportingLinkView[];
    paused: CabinetReportingLinkView[];
    revoked: CabinetReportingLinkView[];
  };
  linkedSnapshots: Map<string, CabinetReportingSnapshotView>;
  filteredLinks: CabinetReportingLinkView[];
  isLoading: boolean;
  isSaving: boolean;
  onOpenChildCabinet: (childCabinetId: string) => void;
  onUpdateLinkStatus: (linkId: string, status: CabinetReportingLinkView["status"]) => void;
}) {
  if (filteredLinks.length <= 0) return null;

  return (
    <div className="space-y-6">
      {([
        ["active", groupedLinks.active],
        ["paused", groupedLinks.paused],
        ["revoked", groupedLinks.revoked],
      ] as const)
        .filter(([, groupLinks]) => groupLinks.length > 0)
        .map(([status, groupLinks]) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${formatReportingStatusTone(status)}`}>
                  {status}
                </span>
                <p className="text-sm text-muted-foreground">
                  {groupLinks.length} link{groupLinks.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {groupLinks.map((link) => (
                <ReportingLinkCard
                  key={link.id}
                  link={link}
                  linkedSnapshot={linkedSnapshots.get(link.childCabinetId)}
                  isLoading={isLoading}
                  isSaving={isSaving}
                  onOpenChildCabinet={onOpenChildCabinet}
                  onUpdateLinkStatus={onUpdateLinkStatus}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

export function ReportingSnapshotHeader({
  snapshotCount,
  staleSnapshotCount,
  isLoading,
  lastUpdatedAt,
  didJustRefresh,
  refreshNotice,
  refreshActivityLabel,
  onRefresh,
}: {
  snapshotCount: number;
  staleSnapshotCount: number;
  isLoading: boolean;
  lastUpdatedAt?: string | null;
  didJustRefresh?: boolean;
  refreshNotice?: string | null;
  refreshActivityLabel?: string | null;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Reporting</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600">
            {snapshotCount} snapshots
          </span>
          {staleSnapshotCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-700">
              {staleSnapshotCount} stale snapshots
            </span>
          ) : null}
          {isLoading ? (
            <ReportingRefreshStatusChip variant="loading" message={refreshActivityLabel} />
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Read-only child cabinet reporting snapshots linked to this workspace.
        </p>
        {didJustRefresh ? (
          <div className="mt-1">
            <ReportingRefreshStatusChip variant="success" message={refreshNotice} />
          </div>
        ) : null}
        {lastUpdatedAt ? (
          <p className="mt-1 text-xs text-slate-500">{formatRefreshStatus(lastUpdatedAt)}</p>
        ) : null}
      </div>
      {onRefresh ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onRefresh}
          disabled={isLoading || didJustRefresh}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {isLoading ? refreshActivityLabel ?? "Refreshing" : "Refresh reporting"}
        </Button>
      ) : null}
    </div>
  );
}

export function ReportingSnapshotFeedback({
  error,
  isLoading,
  staleSnapshotCount,
  snapshotCount,
}: {
  error: string | null;
  isLoading: boolean;
  staleSnapshotCount: number;
  snapshotCount: number;
}) {
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (staleSnapshotCount > 0) {
    return (
      <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
        {staleSnapshotCount} reporting snapshot{staleSnapshotCount === 1 ? " is" : "s are"} older than 24 hours and may need refresh attention.
      </div>
    );
  }

  if (isLoading && snapshotCount === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
        Loading reporting snapshots…
      </div>
    );
  }

  if (!isLoading && snapshotCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-background/60 px-4 py-6 text-sm text-muted-foreground">
        No reporting snapshots available for this cabinet yet.
      </div>
    );
  }

  return null;
}

function ReportingSnapshotCard({
  snapshot,
}: {
  snapshot: CabinetReportingSnapshotView;
}) {
  const snapshotIsStale = isReportingSnapshotStale(snapshot.generatedAt);

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/70 bg-background/85 p-5 shadow-sm",
        snapshotIsStale && "border-amber-500/20 bg-amber-500/5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {snapshot.summary.visibleCabinetNames[0] ?? snapshot.summary.childCabinetNames[0] ?? snapshot.summary.cabinetPath}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">Child cabinet: {snapshot.childCabinetId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {snapshotIsStale ? (
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              stale
            </span>
          ) : null}
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${formatReportingVisibilityTone(snapshot.summary.visibility)}`}>
            {snapshot.summary.visibility}
          </span>
        </div>
      </div>

      <p className={cn("mt-3 text-sm text-muted-foreground", snapshotIsStale && "text-amber-700 dark:text-amber-300")}>
        Generated {formatReportingTime(snapshot.generatedAt)} · {formatReportingDateTime(snapshot.generatedAt)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Items</p>
          <p className="mt-1 text-base font-semibold text-foreground">{snapshot.summary.itemCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Agents</p>
          <p className="mt-1 text-base font-semibold text-foreground">{snapshot.summary.activeAgentCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Jobs</p>
          <p className="mt-1 text-base font-semibold text-foreground">{snapshot.summary.enabledJobCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Children</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {snapshot.summary.visibleChildrenCount}/{snapshot.summary.totalChildrenCount}
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex justify-between gap-3">
          <dt>Cabinet path</dt>
          <dd className="text-right text-foreground">{snapshot.summary.cabinetPath}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Visible descendants</dt>
          <dd className="text-right text-foreground">{snapshot.summary.visibleChildrenCount}</dd>
        </div>
      </dl>
    </article>
  );
}

export function ReportingSnapshotList({
  snapshots,
}: {
  snapshots: CabinetReportingSnapshotView[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {snapshots.map((snapshot) => (
        <ReportingSnapshotCard key={snapshot.childCabinetId} snapshot={snapshot} />
      ))}
    </div>
  );
}
