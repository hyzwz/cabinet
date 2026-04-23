import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLinkedSnapshotMap,
  buildReportingFreshnessCounts,
  buildReportingHealthSummary,
  buildReportingSnapshotCounts,
  buildReportingStatusCounts,
  filterReportingLinks,
  getReportingHealthState,
  getReportingSnapshotAgeMs,
  groupReportingLinksByStatus,
  isReportingSnapshotStale,
} from "../src/components/cabinets/reporting-helpers";
import type {
  CabinetReportingLinkView,
  CabinetReportingSnapshotView,
} from "../src/types/cabinets";

function createLink(
  overrides: Partial<CabinetReportingLinkView> & Pick<CabinetReportingLinkView, "id" | "childCabinetId" | "status">,
): CabinetReportingLinkView {
  return {
    id: overrides.id,
    childCabinetId: overrides.childCabinetId,
    status: overrides.status,
    createdAt: overrides.createdAt ?? "2026-04-20T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-22T00:00:00.000Z",
    createdBy: overrides.createdBy ?? "tester",
  };
}

function createSnapshot(
  overrides: Partial<CabinetReportingSnapshotView> & Pick<CabinetReportingSnapshotView, "childCabinetId" | "generatedAt">,
): CabinetReportingSnapshotView {
  return {
    childCabinetId: overrides.childCabinetId,
    generatedAt: overrides.generatedAt,
    summary: {
      cabinetPath: overrides.summary?.cabinetPath ?? overrides.childCabinetId,
      visibility: overrides.summary?.visibility ?? "all",
      itemCount: overrides.summary?.itemCount ?? 10,
      activeAgentCount: overrides.summary?.activeAgentCount ?? 2,
      enabledJobCount: overrides.summary?.enabledJobCount ?? 1,
      totalChildrenCount: overrides.summary?.totalChildrenCount ?? 3,
      visibleChildrenCount: overrides.summary?.visibleChildrenCount ?? 2,
      childCabinetNames: overrides.summary?.childCabinetNames ?? [overrides.childCabinetId],
      visibleCabinetNames: overrides.summary?.visibleCabinetNames ?? [overrides.childCabinetId],
    },
  };
}

test("reporting helpers compute counts, filtered lists, and health summaries", () => {
  const now = Date.now();
  const freshTime = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const staleTime = new Date(now - 30 * 60 * 60 * 1000).toISOString();

  const links = [
    createLink({ id: "link-active-fresh", childCabinetId: "company/ops", status: "active" }),
    createLink({ id: "link-active-missing", childCabinetId: "company/finance", status: "active" }),
    createLink({ id: "link-paused-stale", childCabinetId: "company/design", status: "paused" }),
    createLink({ id: "link-revoked-fresh", childCabinetId: "company/legal", status: "revoked" }),
  ];

  const snapshots = [
    createSnapshot({ childCabinetId: "company/ops", generatedAt: freshTime }),
    createSnapshot({ childCabinetId: "company/design", generatedAt: staleTime }),
    createSnapshot({ childCabinetId: "company/legal", generatedAt: freshTime }),
  ];

  const linkedSnapshots = buildLinkedSnapshotMap(snapshots);

  assert.equal(linkedSnapshots.size, 3);
  assert.equal(linkedSnapshots.get("company/design")?.generatedAt, staleTime);

  assert.deepEqual(buildReportingStatusCounts(links), {
    all: 4,
    active: 2,
    paused: 1,
    revoked: 1,
  });

  assert.deepEqual(buildReportingSnapshotCounts(links, linkedSnapshots), {
    all: 4,
    present: 3,
    missing: 1,
  });

  assert.deepEqual(buildReportingFreshnessCounts(links, linkedSnapshots), {
    all: 4,
    fresh: 2,
    stale: 1,
  });

  assert.deepEqual(
    filterReportingLinks(links, linkedSnapshots, "active", "missing", "all").map((link) => link.id),
    ["link-active-missing"],
  );

  assert.deepEqual(
    filterReportingLinks(links, linkedSnapshots, "all", "present", "stale").map((link) => link.id),
    ["link-paused-stale"],
  );

  assert.deepEqual(buildReportingHealthSummary(links, linkedSnapshots, "active"), {
    total: 2,
    missingCount: 1,
    staleCount: 0,
    healthyCount: 1,
  });

  assert.deepEqual(buildReportingHealthSummary(links, linkedSnapshots, "all"), {
    total: 4,
    missingCount: 1,
    staleCount: 1,
    healthyCount: 2,
  });

  assert.deepEqual(groupReportingLinksByStatus(links), {
    active: [links[0], links[1]],
    paused: [links[2]],
    revoked: [links[3]],
  });
});

test("reporting helpers derive health state from filter combinations", () => {
  assert.equal(getReportingHealthState("present", "fresh"), "healthy");
  assert.equal(getReportingHealthState("missing", "all"), "missing");
  assert.equal(getReportingHealthState("present", "stale"), "stale");
  assert.equal(getReportingHealthState("all", "all"), null);
  assert.equal(getReportingHealthState("missing", "stale"), null);
});

test("reporting helpers align active health summary with active-only drill-down filters", () => {
  const now = Date.now();
  const freshTime = new Date(now - 60 * 60 * 1000).toISOString();
  const staleTime = new Date(now - 26 * 60 * 60 * 1000).toISOString();

  const links = [
    createLink({ id: "active-fresh", childCabinetId: "company/sales", status: "active" }),
    createLink({ id: "active-missing", childCabinetId: "company/hr", status: "active" }),
    createLink({ id: "active-stale", childCabinetId: "company/support", status: "active" }),
    createLink({ id: "paused-fresh", childCabinetId: "company/legal", status: "paused" }),
  ];

  const linkedSnapshots = buildLinkedSnapshotMap([
    createSnapshot({ childCabinetId: "company/sales", generatedAt: freshTime }),
    createSnapshot({ childCabinetId: "company/support", generatedAt: staleTime }),
    createSnapshot({ childCabinetId: "company/legal", generatedAt: freshTime }),
  ]);

  const activeSummary = buildReportingHealthSummary(links, linkedSnapshots, "active");
  assert.deepEqual(activeSummary, {
    total: 3,
    healthyCount: 1,
    missingCount: 1,
    staleCount: 1,
  });

  const activeHealthy = filterReportingLinks(links, linkedSnapshots, "active", "present", "fresh");
  const activeMissing = filterReportingLinks(links, linkedSnapshots, "active", "missing", "all");
  const activeStale = filterReportingLinks(links, linkedSnapshots, "active", "present", "stale");

  assert.equal(activeHealthy.length, activeSummary.healthyCount);
  assert.equal(activeMissing.length, activeSummary.missingCount);
  assert.equal(activeStale.length, activeSummary.staleCount);

  assert.deepEqual(activeHealthy.map((link) => link.id), ["active-fresh"]);
  assert.deepEqual(activeMissing.map((link) => link.id), ["active-missing"]);
  assert.deepEqual(activeStale.map((link) => link.id), ["active-stale"]);
});

test("reporting helpers support stale and missing investigation filter combinations", () => {
  const now = Date.now();
  const freshTime = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const staleTime = new Date(now - 50 * 60 * 60 * 1000).toISOString();

  const links = [
    createLink({ id: "active-missing", childCabinetId: "company/ops", status: "active" }),
    createLink({ id: "active-stale", childCabinetId: "company/finance", status: "active" }),
    createLink({ id: "paused-stale", childCabinetId: "company/design", status: "paused" }),
    createLink({ id: "revoked-fresh", childCabinetId: "company/legal", status: "revoked" }),
  ];

  const linkedSnapshots = buildLinkedSnapshotMap([
    createSnapshot({ childCabinetId: "company/finance", generatedAt: staleTime }),
    createSnapshot({ childCabinetId: "company/design", generatedAt: staleTime }),
    createSnapshot({ childCabinetId: "company/legal", generatedAt: freshTime }),
  ]);

  assert.deepEqual(
    filterReportingLinks(links, linkedSnapshots, "active", "missing", "all").map((link) => link.id),
    ["active-missing"],
  );

  assert.deepEqual(
    filterReportingLinks(links, linkedSnapshots, "active", "present", "stale").map((link) => link.id),
    ["active-stale"],
  );

  assert.deepEqual(
    filterReportingLinks(links, linkedSnapshots, "all", "present", "stale").map((link) => link.id),
    ["active-stale", "paused-stale"],
  );

  assert.deepEqual(buildReportingFreshnessCounts(links, linkedSnapshots), {
    all: 4,
    fresh: 1,
    stale: 2,
  });

  assert.deepEqual(buildReportingSnapshotCounts(links, linkedSnapshots), {
    all: 4,
    present: 3,
    missing: 1,
  });
});

test("reporting helpers keep grouped status output aligned after combined filters", () => {
  const now = Date.now();
  const freshTime = new Date(now - 90 * 60 * 1000).toISOString();
  const staleTime = new Date(now - 27 * 60 * 60 * 1000).toISOString();

  const links = [
    createLink({ id: "active-fresh", childCabinetId: "company/ops", status: "active" }),
    createLink({ id: "active-stale", childCabinetId: "company/finance", status: "active" }),
    createLink({ id: "paused-stale", childCabinetId: "company/design", status: "paused" }),
    createLink({ id: "revoked-stale", childCabinetId: "company/legal", status: "revoked" }),
  ];

  const linkedSnapshots = buildLinkedSnapshotMap([
    createSnapshot({ childCabinetId: "company/ops", generatedAt: freshTime }),
    createSnapshot({ childCabinetId: "company/finance", generatedAt: staleTime }),
    createSnapshot({ childCabinetId: "company/design", generatedAt: staleTime }),
    createSnapshot({ childCabinetId: "company/legal", generatedAt: staleTime }),
  ]);

  const stalePresentLinks = filterReportingLinks(links, linkedSnapshots, "all", "present", "stale");
  const grouped = groupReportingLinksByStatus(stalePresentLinks);

  assert.deepEqual(grouped, {
    active: [links[1]],
    paused: [links[2]],
    revoked: [links[3]],
  });
});

test("reporting helpers classify stale threshold and invalid timestamps conservatively", () => {
  const now = Date.now();
  const freshTime = new Date(now - (24 * 60 * 60 * 1000 - 60_000)).toISOString();
  const staleTime = new Date(now - (24 * 60 * 60 * 1000 + 60_000)).toISOString();

  assert.equal(isReportingSnapshotStale(freshTime), false);
  assert.equal(isReportingSnapshotStale(staleTime), true);
  assert.equal(isReportingSnapshotStale(undefined), true);
  assert.equal(isReportingSnapshotStale("not-a-date"), true);

  const invalidAge = getReportingSnapshotAgeMs("not-a-date");
  assert.equal(Number.isFinite(invalidAge), false);
});

test("reporting helpers count revoked links within present and stale views without inflating active health scope", () => {
  const now = Date.now();
  const freshTime = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const staleTime = new Date(now - 28 * 60 * 60 * 1000).toISOString();

  const links = [
    createLink({ id: "active-fresh", childCabinetId: "company/ops", status: "active" }),
    createLink({ id: "revoked-stale", childCabinetId: "company/finance", status: "revoked" }),
    createLink({ id: "revoked-missing", childCabinetId: "company/design", status: "revoked" }),
  ];

  const linkedSnapshots = buildLinkedSnapshotMap([
    createSnapshot({ childCabinetId: "company/ops", generatedAt: freshTime }),
    createSnapshot({ childCabinetId: "company/finance", generatedAt: staleTime }),
  ]);

  assert.deepEqual(
    filterReportingLinks(links, linkedSnapshots, "revoked", "present", "stale").map((link) => link.id),
    ["revoked-stale"],
  );

  assert.deepEqual(buildReportingHealthSummary(links, linkedSnapshots, "active"), {
    total: 1,
    healthyCount: 1,
    missingCount: 0,
    staleCount: 0,
  });

  assert.deepEqual(buildReportingHealthSummary(links, linkedSnapshots, "all"), {
    total: 3,
    healthyCount: 1,
    missingCount: 1,
    staleCount: 1,
  });
});


