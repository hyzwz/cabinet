"use client";

import { useEffect } from "react";
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

function ReportingScopeSummary({
  title,
  scope,
  fallbackCabinetPath,
}: {
  title: string;
  scope?: ReportingScopeView | null;
  fallbackCabinetPath: string;
}) {
  const scopeCabinet = scope?.parentCabinetId ?? fallbackCabinetPath;
  const scopeCompany = scope?.companyId ?? null;
  const activeChildrenCount = scope?.activeChildCabinetIds?.length ?? null;

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
          Cabinet {scopeCabinet}
        </span>
        {scopeCompany ? (
          <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
            Company {scopeCompany}
          </span>
        ) : null}
        {activeChildrenCount !== null ? (
          <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
            {activeChildrenCount} active child link{activeChildrenCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ReportingLinksPanel({
  cabinetPath,
  snapshots,
  onRefreshSnapshots,
}: {
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
  const {
    scope: linksScope,
    links,
    statusFilter,
    snapshotFilter,
    freshnessFilter,
    healthScope,
    isLoading,
    error,
    lastUpdatedAt,
    didJustRefresh,
    refreshNotice,
    refreshActivityLabel,
    openCompletionNotice,
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
  } = useReportingLinksData({ cabinetPath, snapshots, onRefreshSnapshots });
  const setSection = useAppStore((state) => state.setSection);

  const scopeParentCabinet = linksScope?.parentCabinetId ?? cabinetPath;
  const isScopeAligned = scopeParentCabinet === cabinetPath;

  const openChildCabinet = (cabinetId: string) => {
    setSection({ type: "cabinet", cabinetPath: cabinetId, mode: "cabinet" });
  };

  const missingOpenCompletionNotice =
    openCompletionNotice === "Opened missing cabinet after refresh"
      ? openCompletionNotice
      : null;
  const staleOpenCompletionNotice =
    openCompletionNotice === "Opened stale cabinet after refresh"
      ? openCompletionNotice
      : null;

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
          title="Reporting link scope"
          scope={linksScope}
          fallbackCabinetPath={cabinetPath}
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
      />

      <ReportingLinksFeedback
        error={error}
        isLoading={isLoading}
        totalLinks={links.length}
        filteredLinksCount={filteredLinks.length}
        statusFilter={statusFilter}
        snapshotFilter={snapshotFilter}
        freshnessFilter={freshnessFilter}
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
  cabinetPath,
  snapshots: initialSnapshots,
  initialError,
  refreshToken = 0,
  onRefreshReady,
}: {
  cabinetPath: string;
  snapshots: CabinetReportingSnapshotView[];
  initialError?: string | null;
  refreshToken?: number;
  onRefreshReady?: (refresh: () => Promise<void>) => void;
}) {
  const {
    scope: snapshotsScope,
    sortedSnapshots,
    isLoading,
    error,
    staleSnapshotCount,
    lastUpdatedAt,
    didJustRefresh,
    refreshNotice,
    refreshActivityLabel,
    refreshSnapshots,
  } = useReportingSnapshotsData({
    cabinetPath,
    initialSnapshots,
    initialError,
    refreshToken,
  });

  useEffect(() => {
    onRefreshReady?.(async () => {
      await refreshSnapshots("manual");
    });
  }, [onRefreshReady, refreshSnapshots]);

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
          title="Reporting snapshot scope"
          scope={snapshotsScope}
          fallbackCabinetPath={cabinetPath}
        />
      </div>

      <div className="mt-4">
        <ReportingSnapshotFeedback
          error={error}
          isLoading={isLoading}
          staleSnapshotCount={staleSnapshotCount}
          snapshotCount={sortedSnapshots.length}
        />
      </div>

      {sortedSnapshots.length > 0 ? <ReportingSnapshotList snapshots={sortedSnapshots} /> : null}
    </section>
  );
}
