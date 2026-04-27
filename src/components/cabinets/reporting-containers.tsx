"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useAppStore } from "@/stores/app-store";
import type { CabinetReportingSnapshotView, ReportingScopeView } from "@/types/cabinets";
import { useReportingLinksData, useReportingSnapshotsData } from "./use-reporting-data";
import {
  ReportingLinksAlerts,
  ReportingLinksFeedback,
  ReportingLinksFilters,
  ReportingLinksGroupedList,
  ReportingLinksHeader,
  ReportingLinksHealthSummary,
  ReportingSnapshotFeedback,
  ReportingSnapshotHeader,
  ReportingSnapshotList,
} from "./reporting-panels";

function formatMissingScopedChildList(childIds: string[]): string | null {
  if (childIds.length === 0) return null;
  const preview = childIds.slice(0, 3);
  const remainingCount = childIds.length - preview.length;
  const previewLabel = preview.join(", ");

  return remainingCount > 0 ? `${previewLabel}, +${remainingCount} more` : previewLabel;
}

function formatMissingScopedChildLead(childIds: string[]): string | null {
  return childIds[0] ?? null;
}

function ReportingScopeSummary({
  title,
  scope,
  fallbackCabinetPath,
  visibilityNotice,
  leadChildCabinet,
  leadChildActionHint,
}: {
  title: string;
  scope?: ReportingScopeView | null;
  fallbackCabinetPath: string;
  visibilityNotice?: string | null;
  leadChildCabinet?: string | null;
  leadChildActionHint?: string | null;
}) {
  const { t, format } = useLocale();
  const scopeCabinet = scope?.parentCabinetPath ?? scope?.parentCabinetId ?? fallbackCabinetPath;
  const scopeCompany = scope?.companyId ?? null;
  const activeChildrenCount = scope?.activeChildCabinetIds?.length ?? null;
  const activeChildrenSuffix =
    activeChildrenCount === 1
      ? t("cabinets.reporting.scope.activeChildLinksSuffix.one")
      : t("cabinets.reporting.scope.activeChildLinksSuffix.other");

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
          {format("cabinets.reporting.scope.cabinet", { value: scopeCabinet })}
        </span>
        {scopeCompany ? (
          <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
            {format("cabinets.reporting.scope.company", { value: scopeCompany })}
          </span>
        ) : null}
        {activeChildrenCount !== null ? (
          <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
            {format("cabinets.reporting.scope.activeChildLinks", {
              count: activeChildrenCount,
              suffix: activeChildrenSuffix,
            })}
          </span>
        ) : null}
        {leadChildCabinet ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
            {format("cabinets.reporting.scope.leadChild", { value: leadChildCabinet })}
            {leadChildActionHint ? ` · ${leadChildActionHint}` : ""}
          </span>
        ) : null}
      </div>
      {visibilityNotice ? <p className="mt-2 text-xs text-muted-foreground">{visibilityNotice}</p> : null}
    </div>
  );
}

export function ReportingLinksPanel({
  cabinetId,
  cabinetPath,
  snapshots,
  onRefreshSnapshots,
}: {
  cabinetId?: string | null;
  cabinetPath: string;
  snapshots: CabinetReportingSnapshotView[];
  onRefreshSnapshots?: (
    source?:
      | "create"
      | "update"
      | "manual"
      | "review-missing"
      | "review-stale"
      | "open-missing"
      | "open-stale"
  ) => Promise<void>;
}) {
  const { t } = useLocale();
  const {
    scope: linksScope,
    links,
    statusFilter,
    snapshotFilter,
    freshnessFilter,
    healthScope,
    isLoading,
    error,
    errorCode,
    lastUpdatedAt,
    didJustRefresh,
    refreshNotice,
    refreshActivityLabel,
    openCompletionNotice,
    statusUpdateNotice,
    newChildCabinetId,
    isSaving,
    linkedSnapshots,
    statusCounts,
    snapshotCounts,
    freshnessCounts,
    filteredLinks,
    activeLinksMissingSnapshots,
    staleLinkedSnapshots,
    healthSummary,
    activeHealthState,
    groupedLinks,
    setStatusFilter,
    setSnapshotFilter,
    setFreshnessFilter,
    setHealthScope,
    setNewChildCabinetId,
    refreshLinks,
    acknowledgeOpenCompletion,
    createLink,
    updateLinkStatus,
  } = useReportingLinksData({ cabinetId, cabinetPath, snapshots, onRefreshSnapshots });
  const setSection = useAppStore((state) => state.setSection);
  const localizedError =
    errorCode === "missing_company_context"
      ? t("cabinets.reporting.error.missingCompanyContext")
      : error;
  const newChildCabinetInputRef = useRef<HTMLInputElement | null>(null);

  const scopeParentCabinet = linksScope?.parentCabinetId ?? cabinetPath;
  const isScopeAligned = scopeParentCabinet === cabinetPath;
  const activeScopedChildIds = linksScope?.activeChildCabinetIds ?? [];
  const visibleLinkedChildIds = useMemo(() => new Set(links.map((link) => link.childCabinetId)), [links]);
  const hiddenScopedChildIds = activeScopedChildIds.filter((childId) => !visibleLinkedChildIds.has(childId));
  const hiddenScopedChildCount = hiddenScopedChildIds.length;
  const hiddenScopedChildPreview = formatMissingScopedChildList(hiddenScopedChildIds);
  const hiddenScopedChildLead = formatMissingScopedChildLead(hiddenScopedChildIds);
  const hiddenScopedChildActionHint = hiddenScopedChildLead
    ? activeLinksMissingSnapshots.length > 0
      ? 'next use "Refresh and open cabinet"'
      : 'next review scope gaps'
    : null;
  const linksScopeGuidanceNotice =
    hiddenScopedChildCount > 0
      ? activeLinksMissingSnapshots.length > 0
        ? `Use "Refresh then review" or "Refresh and open cabinet" below to inspect the first affected missing child cabinet after reconciling links.${hiddenScopedChildLead ? ` Start with ${hiddenScopedChildLead}.` : ""}`
        : `Refresh or review reporting links to reconcile missing active child cabinets in this view.${hiddenScopedChildLead ? ` Start with ${hiddenScopedChildLead}.` : ""}`
      : null;

  const openChildCabinet = (cabinetId: string) => {
    setSection({ type: "cabinet", cabinetPath: cabinetId, mode: "cabinet" });
  };

  const missingOpenCompletionNotice =
    openCompletionNotice === "Opened missing cabinet after refresh"
      ? openCompletionNotice
      : null;
  const linksScopeGuidanceStateNotice =
    refreshActivityLabel === "Refreshing before missing review"
      ? 'Running "Refresh then review" for missing child cabinets now.'
      : refreshActivityLabel === "Refreshing and opening missing cabinet"
        ? 'Running "Refresh and open cabinet" for the next missing child cabinet now.'
        : missingOpenCompletionNotice
          ? `${missingOpenCompletionNotice}. Continue with the next missing child cabinet if scope still shows gaps.`
          : null;
  const linksScopeVisibilityNotice =
    activeScopedChildIds.length === 0
      ? null
      : hiddenScopedChildCount > 0
        ? `Scope tracks ${hiddenScopedChildCount} active child cabinet${hiddenScopedChildCount === 1 ? "" : "s"} not visible in this view yet.${hiddenScopedChildPreview ? ` Missing: ${hiddenScopedChildPreview}.` : ""} ${linksScopeGuidanceNotice}${linksScopeGuidanceStateNotice ? ` ${linksScopeGuidanceStateNotice}` : ""}`
        : "Scope-aligned active children are fully visible in this view.";
  const staleOpenCompletionNotice =
    openCompletionNotice === "Opened stale cabinet after refresh"
      ? openCompletionNotice
      : null;
  const pauseStatusNotice = statusUpdateNotice === "Link paused and scope refreshed" ? statusUpdateNotice : null;
  const reactivateStatusNotice =
    statusUpdateNotice === "Link reactivated and scope refreshed" ? statusUpdateNotice : null;
  const revokeStatusNotice = statusUpdateNotice === "Link revoked and scope refreshed" ? statusUpdateNotice : null;

  return (
    <section
      className="-mx-4 border-b border-border/70 px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      style={{ backgroundColor: "color-mix(in oklch, var(--background) 94%, var(--muted) 6%)" }}
    >
      <ReportingLinksHeader
        statusFilter={statusFilter}
        statusCounts={statusCounts}
        isLoading={isLoading}
        isSaving={isSaving}
        lastUpdatedAt={lastUpdatedAt}
        didJustRefresh={didJustRefresh}
        refreshNotice={refreshNotice}
        refreshActivityLabel={refreshActivityLabel}
        onStatusFilterChange={setStatusFilter}
        onRefresh={() => void refreshLinks("manual")}
      />

      <div className="mb-5">
        <ReportingScopeSummary
          title={t("cabinets.reporting.links.scope")}
          scope={linksScope}
          fallbackCabinetPath={cabinetPath}
          visibilityNotice={linksScopeVisibilityNotice}
          leadChildCabinet={hiddenScopedChildLead}
          leadChildActionHint={hiddenScopedChildActionHint}
        />
      </div>

      <ReportingLinksHealthSummary
        healthSummary={healthSummary}
        healthScope={healthScope}
        activeHealthState={activeHealthState}
        isLoading={isLoading}
        onScopeChange={(scope) => {
          setHealthScope(scope);
          setStatusFilter(scope === "active" ? "active" : "all");
        }}
        onHealthySelect={() => {
          if (healthScope === "active") setStatusFilter("active");
          else setStatusFilter("all");
          setSnapshotFilter("present");
          setFreshnessFilter("fresh");
        }}
        onMissingSelect={() => {
          if (healthScope === "active") setStatusFilter("active");
          else setStatusFilter("all");
          setSnapshotFilter("missing");
          setFreshnessFilter("all");
        }}
        onStaleSelect={() => {
          if (healthScope === "active") setStatusFilter("active");
          else setStatusFilter("all");
          setSnapshotFilter("present");
          setFreshnessFilter("stale");
        }}
      />

      <ReportingLinksAlerts
        activeLinksMissingSnapshots={activeLinksMissingSnapshots}
        staleLinkedSnapshots={staleLinkedSnapshots}
        linkedSnapshots={linkedSnapshots}
        isLoading={isLoading}
        isRefreshingMissingReview={refreshActivityLabel === "Refreshing before missing review"}
        isRefreshingAndOpeningMissing={refreshActivityLabel === "Refreshing and opening missing cabinet"}
        isRefreshingStaleReview={refreshActivityLabel === "Refreshing before stale review"}
        isRefreshingAndOpeningStale={refreshActivityLabel === "Refreshing and opening stale cabinet"}
        missingOpenCompletionNotice={missingOpenCompletionNotice}
        staleOpenCompletionNotice={staleOpenCompletionNotice}
        onOpenChildCabinet={openChildCabinet}
        onReviewMissing={() => {
          setStatusFilter("active");
          setSnapshotFilter("missing");
          setFreshnessFilter("all");
        }}
        onReviewStale={() => {
          setSnapshotFilter("present");
          setFreshnessFilter("stale");
        }}
        onRefreshAndReviewMissing={() => {
          setStatusFilter("active");
          setSnapshotFilter("missing");
          setFreshnessFilter("all");
          void refreshLinks("review-missing");
          void onRefreshSnapshots?.("review-missing");
        }}
        onRefreshAndReviewStale={() => {
          setSnapshotFilter("present");
          setFreshnessFilter("stale");
          void refreshLinks("review-stale");
          void onRefreshSnapshots?.("review-stale");
        }}
        onRefreshAndOpenMissing={() => {
          const target = activeLinksMissingSnapshots[0]?.childCabinetId;
          if (!target) return;
          setStatusFilter("active");
          setSnapshotFilter("missing");
          setFreshnessFilter("all");
          void Promise.all([
            refreshLinks("open-missing"),
            onRefreshSnapshots?.("open-missing") ?? Promise.resolve(null),
          ]).then(([linksNotice]) => {
            acknowledgeOpenCompletion(
              linksNotice ?? "Opened missing cabinet after refresh",
            );
            openChildCabinet(target);
          });
        }}
        onRefreshAndOpenStale={() => {
          const target = staleLinkedSnapshots[0]?.childCabinetId;
          if (!target) return;
          setSnapshotFilter("present");
          setFreshnessFilter("stale");
          void Promise.all([
            refreshLinks("open-stale"),
            onRefreshSnapshots?.("open-stale") ?? Promise.resolve(null),
          ]).then(([linksNotice]) => {
            acknowledgeOpenCompletion(
              linksNotice ?? "Opened stale cabinet after refresh",
            );
            openChildCabinet(target);
          });
        }}
      />

      <ReportingLinksFilters
        scopeParentCabinetId={scopeParentCabinet}
        isScopeAligned={isScopeAligned}
        snapshotFilter={snapshotFilter}
        freshnessFilter={freshnessFilter}
        snapshotCounts={snapshotCounts}
        freshnessCounts={freshnessCounts}
        newChildCabinetId={newChildCabinetId}
        isLoading={isLoading}
        isSaving={isSaving}
        onSnapshotFilterChange={setSnapshotFilter}
        onFreshnessFilterChange={setFreshnessFilter}
        onNewChildCabinetIdChange={setNewChildCabinetId}
        onCreateLink={() => void createLink()}
        newChildCabinetInputRef={newChildCabinetInputRef}
      />

      <ReportingLinksFeedback
        error={localizedError}
        isLoading={isLoading}
        totalLinks={links.length}
        filteredLinksCount={filteredLinks.length}
        statusFilter={statusFilter}
        snapshotFilter={snapshotFilter}
        freshnessFilter={freshnessFilter}
        pauseStatusNotice={pauseStatusNotice}
        reactivateStatusNotice={reactivateStatusNotice}
        revokeStatusNotice={revokeStatusNotice}
        onCreateFirstLink={() => newChildCabinetInputRef.current?.focus()}
      />

      <ReportingLinksGroupedList
        groupedLinks={groupedLinks}
        linkedSnapshots={linkedSnapshots}
        filteredLinks={filteredLinks}
        isLoading={isLoading}
        isSaving={isSaving}
        onOpenChildCabinet={openChildCabinet}
        onUpdateLinkStatus={(linkId, status) => void updateLinkStatus(linkId, status)}
      />
    </section>
  );
}

export function ReportingPanel({
  cabinetId,
  cabinetPath,
  snapshots: initialSnapshots,
  initialError,
  refreshToken = 0,
  onRefreshReady,
}: {
  cabinetId?: string | null;
  cabinetPath: string;
  snapshots: CabinetReportingSnapshotView[];
  initialError?: string | null;
  refreshToken?: number;
  onRefreshReady?: (refresh: () => Promise<void>) => void;
}) {
  const { t } = useLocale();
  const {
    scope: snapshotsScope,
    sortedSnapshots,
    isLoading,
    error,
    errorCode,
    staleSnapshotCount,
    lastUpdatedAt,
    didJustRefresh,
    refreshNotice,
    refreshActivityLabel,
    refreshSnapshots,
  } = useReportingSnapshotsData({
    cabinetId,
    cabinetPath,
    initialSnapshots,
    initialError,
    refreshToken,
  });
  const localizedError =
    errorCode === "missing_company_context"
      ? t("cabinets.reporting.error.missingCompanyContext")
      : error;

  useEffect(() => {
    onRefreshReady?.(async () => {
      await refreshSnapshots("manual");
    });
  }, [onRefreshReady, refreshSnapshots]);

  const activeScopedSnapshotIds = snapshotsScope?.activeChildCabinetIds ?? [];
  const visibleSnapshotIds = useMemo(
    () => new Set(sortedSnapshots.map((snapshot) => snapshot.childCabinetId)),
    [sortedSnapshots],
  );
  const hiddenScopedSnapshotIds = activeScopedSnapshotIds.filter(
    (childId) => !visibleSnapshotIds.has(childId),
  );
  const hiddenScopedSnapshotCount = hiddenScopedSnapshotIds.length;
  const hiddenScopedSnapshotPreview = formatMissingScopedChildList(hiddenScopedSnapshotIds);
  const hiddenScopedSnapshotLead = formatMissingScopedChildLead(hiddenScopedSnapshotIds);
  const hiddenScopedSnapshotActionHint = hiddenScopedSnapshotLead
    ? staleSnapshotCount > 0
      ? 'next use "Open first stale cabinet"'
      : 'next use "Refresh and open cabinet"'
    : null;
  const snapshotScopeGuidanceNotice =
    hiddenScopedSnapshotCount > 0
      ? staleSnapshotCount > 0
        ? `Use "Review stale links" or "Open first stale cabinet" above after refreshing snapshots to inspect the affected cabinets.${hiddenScopedSnapshotLead ? ` Start with ${hiddenScopedSnapshotLead}.` : ""}`
        : `Use "Refresh then review" or "Refresh and open cabinet" above after refreshing snapshots to inspect the affected missing cabinets.${hiddenScopedSnapshotLead ? ` Start with ${hiddenScopedSnapshotLead}.` : ""}`
      : null;
  const snapshotScopeGuidanceStateNotice =
    refreshActivityLabel === "Refreshing manually"
      ? "Refreshing reporting snapshots now to reconcile the missing active child cabinets in this view."
      : didJustRefresh && hiddenScopedSnapshotCount > 0
        ? "Snapshots refreshed; use the review/open actions above if scope still shows missing active child cabinets."
        : null;
  const snapshotScopeVisibilityNotice =
    activeScopedSnapshotIds.length === 0
      ? null
      : hiddenScopedSnapshotCount > 0
        ? `Scope tracks ${hiddenScopedSnapshotCount} active child cabinet${hiddenScopedSnapshotCount === 1 ? "" : "s"} without visible snapshots in this view.${hiddenScopedSnapshotPreview ? ` Missing: ${hiddenScopedSnapshotPreview}.` : ""} ${snapshotScopeGuidanceNotice}${snapshotScopeGuidanceStateNotice ? ` ${snapshotScopeGuidanceStateNotice}` : ""}`
        : "Scope-aligned active children all have visible snapshots in this view.";

  return (
    <section
      className="-mx-4 border-b border-border/70 px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      style={{ backgroundColor: "color-mix(in oklch, var(--background) 95%, var(--secondary) 5%)" }}
    >
      <ReportingSnapshotHeader
        snapshotCount={sortedSnapshots.length}
        staleSnapshotCount={staleSnapshotCount}
        isLoading={isLoading}
        lastUpdatedAt={lastUpdatedAt}
        didJustRefresh={didJustRefresh}
        refreshNotice={refreshNotice}
        refreshActivityLabel={refreshActivityLabel}
        onRefresh={() => void refreshSnapshots("manual")}
      />

      <div className="mt-4">
        <ReportingScopeSummary
          title={t("cabinets.reporting.snapshots.scope")}
          scope={snapshotsScope}
          fallbackCabinetPath={cabinetPath}
          visibilityNotice={snapshotScopeVisibilityNotice}
          leadChildCabinet={hiddenScopedSnapshotLead}
          leadChildActionHint={hiddenScopedSnapshotActionHint}
        />
      </div>

      <div className="mt-4">
        <ReportingSnapshotFeedback
          error={localizedError}
          isLoading={isLoading}
          staleSnapshotCount={staleSnapshotCount}
          snapshotCount={sortedSnapshots.length}
        />
      </div>

      {sortedSnapshots.length > 0 ? <ReportingSnapshotList snapshots={sortedSnapshots} /> : null}
    </section>
  );
}
