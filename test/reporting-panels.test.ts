import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { LocaleProvider } from "../src/components/i18n/locale-provider";
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
} from "../src/components/cabinets/reporting-panels";
import {
  assertEmptyMarkup,
  assertHtmlExcludes,
  assertHtmlIncludesAll,
  assertReportingAlert,
  assertReportingFeedback,
  assertReportingFiltersInvestigation,
  assertReportingHeader,
  assertReportingLinkGroup,
  assertReportingSnapshotSummary,
  renderMarkup,
} from "./reporting-assertion-utils";
import { createReportingLink, createReportingSnapshot } from "./reporting-test-utils";

function render(element: React.ReactElement, locale: "en" | "zh" = "en") {
  return renderMarkup(
    React.createElement(LocaleProvider, { initialLocale: locale }, element),
  );
}

test("reporting panels render links feedback for error, empty, and filtered-empty states", () => {
  const errorMarkup = render(
    React.createElement(ReportingLinksFeedback, {
      error: "Failed to load reporting links",
      isLoading: false,
      totalLinks: 3,
      filteredLinksCount: 0,
      statusFilter: "all",
      snapshotFilter: "all",
      freshnessFilter: "all",
    }),
  );
  assertReportingFeedback(errorMarkup, ["Failed to load reporting links"]);

  const emptyMarkup = render(
    React.createElement(ReportingLinksFeedback, {
      error: null,
      isLoading: false,
      totalLinks: 0,
      filteredLinksCount: 0,
      statusFilter: "all",
      snapshotFilter: "all",
      freshnessFilter: "all",
      onCreateFirstLink: () => {},
    }),
  );
  assertReportingFeedback(emptyMarkup, [
    "No reporting links configured for this cabinet",
    "Add a child cabinet link below to define which workspaces should publish reporting snapshots here",
    "Add first reporting link",
  ]);

  const filteredEmptyMarkup = render(
    React.createElement(ReportingLinksFeedback, {
      error: null,
      isLoading: false,
      totalLinks: 4,
      filteredLinksCount: 0,
      statusFilter: "active",
      snapshotFilter: "missing",
      freshnessFilter: "all",
    }),
  );
  assertReportingFeedback(filteredEmptyMarkup, [
    "No active reporting links with missing snapshots match the current filters",
  ]);
});

test("reporting panels suppress links feedback while loading or when filtered links are present", () => {
  const loadingMarkup = render(
    React.createElement(ReportingLinksFeedback, {
      error: null,
      isLoading: true,
      totalLinks: 2,
      filteredLinksCount: 0,
      statusFilter: "all",
      snapshotFilter: "all",
      freshnessFilter: "all",
    }),
  );
  assertEmptyMarkup(loadingMarkup);

  const populatedMarkup = render(
    React.createElement(ReportingLinksFeedback, {
      error: null,
      isLoading: false,
      totalLinks: 2,
      filteredLinksCount: 1,
      statusFilter: "all",
      snapshotFilter: "present",
      freshnessFilter: "fresh",
    }),
  );
  assertEmptyMarkup(populatedMarkup);
});

test("reporting panels render links header refresh notices", () => {
  const markup = render(
    React.createElement(ReportingLinksHeader, {
      statusFilter: "all",
      statusCounts: { all: 3, active: 2, paused: 1, revoked: 0 },
      isLoading: false,
      isSaving: false,
      didJustRefresh: true,
      refreshNotice: "Links synced after create",
      lastUpdatedAt: "2026-04-22T10:00:00.000Z",
      onStatusFilterChange: () => {},
      onRefresh: () => {},
    }),
  );

  assertReportingHeader(markup, [
    "Reporting links",
    "Links synced after create",
    "Last refreshed",
    "sync",
  ]);
  assert.match(markup, /data-feedback-variant="success"/);
  assert.match(markup, /data-feedback-tone="sync"/);
  assert.match(markup, /data-feedback-icon="sync"/);
  assert.match(markup, /border-emerald-500\/25 bg-emerald-100 text-emerald-700/);
  assert.match(markup, /inline-flex items-center gap-1/);
  assert.match(markup, /aria-hidden="true"/);

  const manualMarkup = render(
    React.createElement(ReportingLinksHeader, {
      statusFilter: "all",
      statusCounts: { all: 3, active: 2, paused: 1, revoked: 0 },
      isLoading: false,
      isSaving: false,
      didJustRefresh: true,
      refreshNotice: "Links refreshed manually",
      lastUpdatedAt: null,
      onStatusFilterChange: () => {},
      onRefresh: () => {},
    }),
  );

  assert.match(manualMarkup, /border-sky-500\/25 bg-sky-100 text-sky-700/);
});

test("reporting panels render links header loading tone for manual refresh", () => {
  const markup = render(
    React.createElement(ReportingLinksHeader, {
      statusFilter: "all",
      statusCounts: { all: 3, active: 2, paused: 1, revoked: 0 },
      isLoading: true,
      isSaving: false,
      didJustRefresh: false,
      refreshActivityLabel: "Refreshing links manually",
      refreshNotice: null,
      lastUpdatedAt: null,
      onStatusFilterChange: () => {},
      onRefresh: () => {},
    }),
  );

  assert.match(markup, /Refreshing links manually/);
  assert.match(markup, /data-feedback-variant="loading"/);
  assert.match(markup, /data-feedback-tone="manual"/);
  assert.match(markup, /data-feedback-icon="manual"/);
  assert.match(markup, /inline-flex items-center gap-1/);
  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /svg/);
  assert.match(markup, />manual<\/span>/);
  assert.match(markup, /Loader2|animate-spin|svg/);
  assert.match(markup, /disabled=""/);
});
test("reporting panels render active-only and highlighted health summary states", () => {
  const markup = render(
    React.createElement(ReportingLinksHealthSummary, {
      healthSummary: { total: 5, healthyCount: 2, missingCount: 1, staleCount: 2 },
      healthScope: "active",
      activeHealthState: "missing",
      isLoading: false,
      onScopeChange: () => {},
      onHealthySelect: () => {},
      onMissingSelect: () => {},
      onStaleSelect: () => {},
    }),
  );

  assertHtmlIncludesAll(markup, [
    "Reporting health scope",
    "Summary is focused on active reporting links",
    "active only",
    "all links",
    "Active links that do not currently have any reporting snapshot available",
    "ring-1 ring-amber-500/20",
  ]);
});

test("reporting panels suppress health summary when there are no scoped links", () => {
  const markup = render(
    React.createElement(ReportingLinksHealthSummary, {
      healthSummary: { total: 0, healthyCount: 0, missingCount: 0, staleCount: 0 },
      healthScope: "all",
      activeHealthState: null,
      isLoading: false,
      onScopeChange: () => {},
      onHealthySelect: () => {},
      onMissingSelect: () => {},
      onStaleSelect: () => {},
    }),
  );

  assertEmptyMarkup(markup);
});

test("reporting panels render links alerts for missing and stale snapshots", () => {
  const missingUpdatedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const staleUpdatedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const staleGeneratedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const missingLink = createReportingLink({
    id: "link-missing",
    childCabinetId: "cab-missing",
    status: "active",
    createdBy: "ops-admin",
    updatedAt: missingUpdatedAt,
  });
  const staleLink = createReportingLink({ id: "link-stale", childCabinetId: "cab-stale", updatedAt: staleUpdatedAt });
  const staleSnapshot = createReportingSnapshot({
    childCabinetId: "cab-stale",
    generatedAt: staleGeneratedAt,
    summary: { cabinetPath: "example-company/stale-child", itemCount: 7, activeAgentCount: 2, enabledJobCount: 1 },
  });

  const markup = render(
    React.createElement(ReportingLinksAlerts, {
      activeLinksMissingSnapshots: [missingLink],
      staleLinkedSnapshots: [staleLink],
      linkedSnapshots: new Map([["cab-stale", staleSnapshot]]),
      isLoading: false,
      isRefreshingMissingReview: true,
      isRefreshingAndOpeningMissing: true,
      isRefreshingStaleReview: true,
      isRefreshingAndOpeningStale: true,
      onOpenChildCabinet: () => {},
      onReviewMissing: () => {},
      onReviewStale: () => {},
      onRefreshAndReviewMissing: () => {},
      onRefreshAndReviewStale: () => {},
      onRefreshAndOpenMissing: () => {},
      onRefreshAndOpenStale: () => {},
    }),
  );

  const completedMarkup = render(
    React.createElement(ReportingLinksAlerts, {
      activeLinksMissingSnapshots: [missingLink],
      staleLinkedSnapshots: [staleLink],
      linkedSnapshots: new Map([["cab-stale", staleSnapshot]]),
      isLoading: false,
      isRefreshingMissingReview: false,
      isRefreshingAndOpeningMissing: false,
      isRefreshingStaleReview: false,
      isRefreshingAndOpeningStale: false,
      missingOpenCompletionNotice: "Opened missing cabinet after refresh",
      staleOpenCompletionNotice: "Opened stale cabinet after refresh",
      onOpenChildCabinet: () => {},
      onReviewMissing: () => {},
      onReviewStale: () => {},
      onRefreshAndReviewMissing: () => {},
      onRefreshAndReviewStale: () => {},
      onRefreshAndOpenMissing: () => {},
      onRefreshAndOpenStale: () => {},
    }),
  );

  assertReportingAlert(markup, "Active reporting links without snapshots", [
    "Review active missing links",
    "Refreshing before missing review...",
    "Refreshing and opening cabinet...",
    "cab-missing",
    "Updated",
    "Last change",
    "Status active",
    "Missing state missing after recent update · active",
    "severity recent drift",
    "Created by ops-admin",
  ]);
  assertReportingAlert(completedMarkup, "Active reporting links without snapshots", [
    "Opened missing cabinet after refresh",
  ]);
  assertReportingAlert(markup, "Reporting links with stale snapshots", [
    "Review stale links",
    "Refreshing before stale review...",
    "Refreshing and opening cabinet...",
    "cab-stale",
    "example-company/stale-child",
    "stale",
    "Generated",
    "Snapshot age 2d ago",
    "Freshness stale for 1d+",
    "7 items · 2 agents · 1 jobs",
  ]);
  assertReportingAlert(completedMarkup, "Reporting links with stale snapshots", [
    "Opened stale cabinet after refresh",
  ]);
});

test("reporting panels suppress links alerts when there are no anomalies", () => {
  const markup = render(
    React.createElement(ReportingLinksAlerts, {
      activeLinksMissingSnapshots: [],
      staleLinkedSnapshots: [],
      linkedSnapshots: new Map(),
      isLoading: false,
      onOpenChildCabinet: () => {},
      onReviewMissing: () => {},
      onReviewStale: () => {},
    }),
  );

  assertEmptyMarkup(markup);
});

test("reporting panels render snapshot feedback for error, stale, loading, and empty states", () => {
  const errorMarkup = render(
    React.createElement(ReportingSnapshotFeedback, {
      error: "Failed to load cabinet reporting",
      isLoading: false,
      staleSnapshotCount: 0,
      snapshotCount: 2,
    }),
  );
  assertReportingFeedback(errorMarkup, ["Failed to load cabinet reporting"]);

  const staleMarkup = render(
    React.createElement(ReportingSnapshotFeedback, {
      error: null,
      isLoading: false,
      staleSnapshotCount: 2,
      snapshotCount: 2,
    }),
  );
  assertReportingFeedback(staleMarkup, ["2 reporting snapshots are older than 24 hours"]);

  const loadingMarkup = render(
    React.createElement(ReportingSnapshotFeedback, {
      error: null,
      isLoading: true,
      staleSnapshotCount: 0,
      snapshotCount: 0,
    }),
  );
  assertReportingFeedback(loadingMarkup, ["Loading reporting snapshots"]);

  const emptyMarkup = render(
    React.createElement(ReportingSnapshotFeedback, {
      error: null,
      isLoading: false,
      staleSnapshotCount: 0,
      snapshotCount: 0,
    }),
  );
  assertReportingFeedback(emptyMarkup, [
    "No reporting snapshots available for this cabinet yet",
    "Snapshots will appear here after at least one active reporting link is configured and refreshed",
  ]);
});

test("reporting panels render snapshot header loading and manual refresh states", () => {
  const markup = render(
    React.createElement(ReportingSnapshotHeader, {
      snapshotCount: 3,
      staleSnapshotCount: 1,
      isLoading: true,
      didJustRefresh: true,
      refreshActivityLabel: "Refreshing snapshots manually",
      refreshNotice: "Snapshots refreshed manually",
      lastUpdatedAt: "2026-04-22T10:00:00.000Z",
      onRefresh: () => {},
    }),
  );

  assert.match(markup, /Reporting/);
  assert.match(markup, /3 snapshots/);
  assert.match(markup, /1 stale snapshots/);
  assert.ok(markup.includes("Refreshing snapshots manually"));
  assert.ok(markup.includes("Snapshots refreshed manually"));
  assert.ok(markup.includes(">✦</span>"));
  assert.ok(markup.includes(">manual</span>"));
  assert.ok(markup.includes("border-sky-500/20 bg-sky-100 text-sky-700 ring-1 ring-sky-500/10"));
  assert.ok(markup.includes("border-sky-500/25 bg-sky-100 text-sky-700 ring-1 ring-sky-500/10"));
  assert.ok(markup.includes("disabled=\"\""));
});

test("reporting panels render snapshot header review success tone", () => {
  const markup = render(
    React.createElement(ReportingSnapshotHeader, {
      snapshotCount: 3,
      staleSnapshotCount: 1,
      isLoading: false,
      didJustRefresh: true,
      refreshNotice: "Snapshots refreshed before stale review",
      lastUpdatedAt: null,
      onRefresh: () => {},
    }),
  );

  assert.ok(markup.includes("Snapshots refreshed before stale review"));
  assert.ok(markup.includes("border-amber-500/25 bg-amber-100 text-amber-700"));
});
test("reporting panels render snapshot header review and open feedback tones", () => {
  const reviewMarkup = render(
    React.createElement(ReportingSnapshotHeader, {
      snapshotCount: 2,
      staleSnapshotCount: 1,
      isLoading: true,
      didJustRefresh: false,
      refreshActivityLabel: "Refreshing before stale review",
      refreshNotice: null,
      lastUpdatedAt: null,
      onRefresh: () => undefined,
    }),
  );
  assert.match(reviewMarkup, /Refreshing before stale review/);
  assert.match(reviewMarkup, /bg-amber-100 text-amber-700/);

  const openMarkup = render(
    React.createElement(ReportingSnapshotHeader, {
      snapshotCount: 2,
      staleSnapshotCount: 1,
      isLoading: false,
      didJustRefresh: true,
      refreshNotice: "Snapshots refreshed before opening stale cabinet",
      refreshActivityLabel: null,
      lastUpdatedAt: null,
      onRefresh: () => undefined,
    }),
  );
  assert.match(openMarkup, /Snapshots refreshed before opening stale cabinet/);
  assert.match(openMarkup, /text-violet-700/);
});

test("reporting panels render filters guidance for missing, stale, and combined investigation views", () => {
  const missingMarkup = render(
    React.createElement(ReportingLinksFilters, {
      snapshotFilter: "missing",
      freshnessFilter: "all",
      snapshotCounts: { all: 4, present: 2, missing: 2 },
      freshnessCounts: { all: 4, fresh: 1, stale: 1 },
      newChildCabinetId: "",
      isLoading: false,
      isSaving: false,
      onSnapshotFilterChange: () => {},
      onFreshnessFilterChange: () => {},
      onNewChildCabinetIdChange: () => {},
      onCreateLink: () => {},
    }),
  );
  assertReportingFiltersInvestigation(missingMarkup, [
    "Showing links that do not currently have a reporting snapshot",
  ]);
  assertHtmlExcludes(missingMarkup, ["Showing links whose latest reporting snapshot is older than 24 hours"]);

  const staleMarkup = render(
    React.createElement(ReportingLinksFilters, {
      snapshotFilter: "all",
      freshnessFilter: "stale",
      snapshotCounts: { all: 4, present: 3, missing: 1 },
      freshnessCounts: { all: 4, fresh: 2, stale: 1 },
      newChildCabinetId: "child/path",
      isLoading: false,
      isSaving: false,
      onSnapshotFilterChange: () => {},
      onFreshnessFilterChange: () => {},
      onNewChildCabinetIdChange: () => {},
      onCreateLink: () => {},
    }),
  );
  assertReportingFiltersInvestigation(staleMarkup, [
    "Showing links whose latest reporting snapshot is older than 24 hours",
  ]);
  assertHtmlExcludes(staleMarkup, ["Showing links that do not currently have a reporting snapshot"]);

  const combinedMarkup = render(
    React.createElement(ReportingLinksFilters, {
      snapshotFilter: "missing",
      freshnessFilter: "stale",
      snapshotCounts: { all: 4, present: 3, missing: 1 },
      freshnessCounts: { all: 4, fresh: 2, stale: 1 },
      newChildCabinetId: "child/path",
      isLoading: false,
      isSaving: false,
      onSnapshotFilterChange: () => {},
      onFreshnessFilterChange: () => {},
      onNewChildCabinetIdChange: () => {},
      onCreateLink: () => {},
    }),
  );
  assertReportingFiltersInvestigation(combinedMarkup, [
    "Showing links that do not currently have a reporting snapshot",
    "Showing links whose latest reporting snapshot is older than 24 hours",
    "Add link",
    "Child cabinet path",
  ]);
});

test("reporting panels suppress filters guidance when investigation filters are not active", () => {
  const markup = render(
    React.createElement(ReportingLinksFilters, {
      snapshotFilter: "present",
      freshnessFilter: "fresh",
      snapshotCounts: { all: 4, present: 3, missing: 1 },
      freshnessCounts: { all: 4, fresh: 2, stale: 1 },
      newChildCabinetId: "",
      isLoading: false,
      isSaving: false,
      onSnapshotFilterChange: () => {},
      onFreshnessFilterChange: () => {},
      onNewChildCabinetIdChange: () => {},
      onCreateLink: () => {},
    }),
  );

  assertHtmlExcludes(markup, [
    "Showing links that do not currently have a reporting snapshot",
    "Showing links whose latest reporting snapshot is older than 24 hours",
  ]);
});

test("reporting panels render grouped links with stale and revoked card states", () => {
  const activeLink = createReportingLink({ id: "link-active", childCabinetId: "cab-active", status: "active" });
  const revokedLink = createReportingLink({ id: "link-revoked", childCabinetId: "cab-revoked", status: "revoked" });
  const staleSnapshot = createReportingSnapshot({
    childCabinetId: "cab-active",
    generatedAt: "2026-04-20T07:00:00.000Z",
    summary: {
      cabinetPath: "example-company/active-child",
      visibility: "children-1",
      itemCount: 12,
      activeAgentCount: 4,
      enabledJobCount: 5,
      visibleChildrenCount: 2,
      totalChildrenCount: 3,
    },
  });

  const markup = render(
    React.createElement(ReportingLinksGroupedList, {
      groupedLinks: {
        active: [activeLink],
        paused: [],
        revoked: [revokedLink],
      },
      linkedSnapshots: new Map([["cab-active", staleSnapshot]]),
      filteredLinks: [activeLink, revokedLink],
      isLoading: false,
      isSaving: false,
      onOpenChildCabinet: () => {},
      onUpdateLinkStatus: () => {},
    }),
  );

  assertReportingLinkGroup(markup, "active", [
    "Open cabinet",
    "stale snapshot",
    "example-company/active-child",
  ]);
  assertReportingLinkGroup(markup, "revoked", [
    "Revoked links stay visible for audit and history",
    "Inactive links do not currently publish snapshots",
  ]);
});

test("reporting panels suppress grouped links list when filters produce no results", () => {
  const markup = render(
    React.createElement(ReportingLinksGroupedList, {
      groupedLinks: {
        active: [],
        paused: [],
        revoked: [],
      },
      linkedSnapshots: new Map(),
      filteredLinks: [],
      isLoading: false,
      isSaving: false,
      onOpenChildCabinet: () => {},
      onUpdateLinkStatus: () => {},
    }),
  );

  assertEmptyMarkup(markup);
});

test("reporting panels render snapshot list cards with stale and fresh summaries", () => {
  const freshSnapshot = createReportingSnapshot({
    childCabinetId: "cab-fresh",
    generatedAt: "2026-04-22T08:00:00.000Z",
    summary: {
      cabinetPath: "example-company/fresh-child",
      visibility: "private",
      itemCount: 4,
      activeAgentCount: 1,
      enabledJobCount: 2,
      visibleChildrenCount: 0,
      totalChildrenCount: 1,
    },
  });
  const staleSnapshot = createReportingSnapshot({
    childCabinetId: "cab-stale-list",
    generatedAt: "2026-04-20T07:00:00.000Z",
    summary: {
      cabinetPath: "example-company/stale-list-child",
      visibility: "children-2",
      itemCount: 9,
      activeAgentCount: 3,
      enabledJobCount: 4,
      visibleChildrenCount: 2,
      totalChildrenCount: 2,
    },
  });

  const markup = render(
    React.createElement(ReportingSnapshotList, {
      snapshots: [freshSnapshot, staleSnapshot],
    }),
  );

  assertReportingSnapshotSummary(markup, [
    "Child cabinet: cab-fresh",
    "Child cabinet: cab-stale-list",
    "Generated",
    "private",
    "children-2",
    "example-company/fresh-child",
    "example-company/stale-list-child",
    "stale",
    "Visible descendants",
  ]);
});

test("reporting panels suppress snapshot feedback when snapshots are healthy and populated", () => {
  const markup = render(
    React.createElement(ReportingSnapshotFeedback, {
      error: null,
      isLoading: false,
      staleSnapshotCount: 0,
      snapshotCount: 3,
    }),
  );
  assertEmptyMarkup(markup);
});
