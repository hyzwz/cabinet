import type {
  CabinetReportingLinkView,
  CabinetReportingSnapshotView,
} from "../src/types/cabinets";

export function createReportingLink(
  overrides: Partial<CabinetReportingLinkView> = {},
): CabinetReportingLinkView {
  return {
    id: overrides.id ?? "link-1",
    companyId: overrides.companyId ?? "company",
    parentCabinetId: overrides.parentCabinetId ?? "cab-parent",
    childCabinetId: overrides.childCabinetId ?? "cab-child",
    status: overrides.status ?? "active",
    createdBy: overrides.createdBy ?? "owner@example.com",
    createdAt: overrides.createdAt ?? "2026-04-20T08:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-22T08:00:00.000Z",
  };
}

export function createReportingSnapshot(
  overrides: Partial<CabinetReportingSnapshotView> = {},
): CabinetReportingSnapshotView {
  return {
    companyId: overrides.companyId ?? "company",
    parentCabinetId: overrides.parentCabinetId ?? "cab-parent",
    childCabinetId: overrides.childCabinetId ?? "cab-child",
    generatedAt: overrides.generatedAt ?? "2026-04-22T08:00:00.000Z",
    summary: {
      cabinetPath: overrides.summary?.cabinetPath ?? "example-company/child",
      visibleCabinetNames: overrides.summary?.visibleCabinetNames ?? ["Child cabinet"],
      childCabinetNames: overrides.summary?.childCabinetNames ?? ["Child cabinet"],
      childCabinetPaths: overrides.summary?.childCabinetPaths ?? [overrides.childCabinetId ?? "cab-child"],
      visibleCabinetPaths: overrides.summary?.visibleCabinetPaths ?? [overrides.childCabinetId ?? "cab-child"],
      visibility: overrides.summary?.visibility ?? "children-2",
      itemCount: overrides.summary?.itemCount ?? 8,
      activeAgentCount: overrides.summary?.activeAgentCount ?? 2,
      inheritedAgentCount: overrides.summary?.inheritedAgentCount ?? 1,
      enabledJobCount: overrides.summary?.enabledJobCount ?? 3,
      inheritedJobCount: overrides.summary?.inheritedJobCount ?? 1,
      visibleChildrenCount: overrides.summary?.visibleChildrenCount ?? 1,
      totalChildrenCount: overrides.summary?.totalChildrenCount ?? 2,
    },
  };
}

export function createMockFetchResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body,
  };
}
