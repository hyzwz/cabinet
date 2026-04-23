import type {
  CabinetReportingLinkView,
  CabinetReportingSnapshotView,
} from "@/types/cabinets";

export type ReportingHealthScope = "all" | "active";
export type ReportingSnapshotFilter = "all" | "present" | "missing";
export type ReportingFreshnessFilter = "all" | "fresh" | "stale";
export type ReportingHealthState = "healthy" | "missing" | "stale" | null;

export function formatReportingStatusTone(status: CabinetReportingLinkView["status"]) {
  if (status === "active") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "paused") return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-border/70 bg-muted/30 text-muted-foreground";
}

export function formatReportingVisibilityTone(visibility?: string) {
  if (visibility === "all") return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (visibility === "children-2" || visibility === "children-1") {
    return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }
  return "border-border/70 bg-muted/30 text-muted-foreground";
}

export function getReportingSnapshotAgeMs(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return Number.POSITIVE_INFINITY;

  return Math.max(0, Date.now() - timestamp);
}

export function isReportingSnapshotStale(value?: string | null) {
  return getReportingSnapshotAgeMs(value) >= 24 * 60 * 60 * 1000;
}

export function buildLinkedSnapshotMap(snapshots: CabinetReportingSnapshotView[]) {
  return new Map(snapshots.map((snapshot) => [snapshot.childCabinetId, snapshot]));
}

export function buildReportingStatusCounts(links: CabinetReportingLinkView[]) {
  return {
    all: links.length,
    active: links.filter((link) => link.status === "active").length,
    paused: links.filter((link) => link.status === "paused").length,
    revoked: links.filter((link) => link.status === "revoked").length,
  };
}

export function buildReportingSnapshotCounts(
  links: CabinetReportingLinkView[],
  linkedSnapshots: Map<string, CabinetReportingSnapshotView>,
) {
  return {
    all: links.length,
    present: links.filter((link) => linkedSnapshots.has(link.childCabinetId)).length,
    missing: links.filter((link) => !linkedSnapshots.has(link.childCabinetId)).length,
  };
}

export function buildReportingFreshnessCounts(
  links: CabinetReportingLinkView[],
  linkedSnapshots: Map<string, CabinetReportingSnapshotView>,
) {
  return {
    all: links.length,
    fresh: links.filter((link) => {
      const snapshot = linkedSnapshots.get(link.childCabinetId);
      return snapshot ? !isReportingSnapshotStale(snapshot.generatedAt) : false;
    }).length,
    stale: links.filter((link) => {
      const snapshot = linkedSnapshots.get(link.childCabinetId);
      return snapshot ? isReportingSnapshotStale(snapshot.generatedAt) : false;
    }).length,
  };
}

export function filterReportingLinks(
  links: CabinetReportingLinkView[],
  linkedSnapshots: Map<string, CabinetReportingSnapshotView>,
  statusFilter: "all" | CabinetReportingLinkView["status"],
  snapshotFilter: ReportingSnapshotFilter,
  freshnessFilter: ReportingFreshnessFilter,
) {
  const statusScopedLinks =
    statusFilter === "all"
      ? links
      : links.filter((link) => link.status === statusFilter);

  const snapshotScopedLinks =
    snapshotFilter === "all"
      ? statusScopedLinks
      : snapshotFilter === "present"
        ? statusScopedLinks.filter((link) => linkedSnapshots.has(link.childCabinetId))
        : statusScopedLinks.filter((link) => !linkedSnapshots.has(link.childCabinetId));

  if (freshnessFilter === "all") return snapshotScopedLinks;
  if (freshnessFilter === "fresh") {
    return snapshotScopedLinks.filter((link) => {
      const snapshot = linkedSnapshots.get(link.childCabinetId);
      return snapshot ? !isReportingSnapshotStale(snapshot.generatedAt) : false;
    });
  }

  return snapshotScopedLinks.filter((link) => {
    const snapshot = linkedSnapshots.get(link.childCabinetId);
    return snapshot ? isReportingSnapshotStale(snapshot.generatedAt) : false;
  });
}

export function buildReportingHealthSummary(
  links: CabinetReportingLinkView[],
  linkedSnapshots: Map<string, CabinetReportingSnapshotView>,
  healthScope: ReportingHealthScope,
) {
  const scopedLinks =
    healthScope === "active"
      ? links.filter((link) => link.status === "active")
      : links;

  const missingCount = scopedLinks.filter((link) => !linkedSnapshots.has(link.childCabinetId)).length;
  const staleCount = scopedLinks.filter((link) => {
    const snapshot = linkedSnapshots.get(link.childCabinetId);
    return snapshot ? isReportingSnapshotStale(snapshot.generatedAt) : false;
  }).length;
  const healthyCount = scopedLinks.filter((link) => {
    const snapshot = linkedSnapshots.get(link.childCabinetId);
    return snapshot ? !isReportingSnapshotStale(snapshot.generatedAt) : false;
  }).length;

  return {
    total: scopedLinks.length,
    missingCount,
    staleCount,
    healthyCount,
  };
}

export function getReportingHealthState(
  snapshotFilter: ReportingSnapshotFilter,
  freshnessFilter: ReportingFreshnessFilter,
): ReportingHealthState {
  if (snapshotFilter === "missing" && freshnessFilter === "all") return "missing";
  if (snapshotFilter === "present" && freshnessFilter === "fresh") return "healthy";
  if (snapshotFilter === "present" && freshnessFilter === "stale") return "stale";
  return null;
}

export function groupReportingLinksByStatus(links: CabinetReportingLinkView[]) {
  return {
    active: links.filter((link) => link.status === "active"),
    paused: links.filter((link) => link.status === "paused"),
    revoked: links.filter((link) => link.status === "revoked"),
  };
}
