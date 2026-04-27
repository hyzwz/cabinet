import fs from "fs/promises";
import path from "path";
import { readCabinetOverview } from "@/lib/cabinets/overview";
import { getManagedDataDir } from "@/lib/runtime/runtime-config";
import {
  authorizeUserAction,
  resolveOwnershipChainFromVirtualPath,
  type Actor,
  type AuthorizationDecision,
  type CabinetContext,
  type CabinetOwnership,
  type CompanyContext,
  type CompanyOwnership,
  type PageResourceContext,
} from "@/lib/auth/page-authorization";

export type CabinetReportingLinkStatus = "active" | "paused" | "revoked";

export type CabinetReportingLink = {
  id: string;
  companyId: string;
  parentCabinetId: string;
  childCabinetId: string;
  status: CabinetReportingLinkStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportingSnapshotSummary = {
  cabinetPath: string;
  visibility: string;
  itemCount: number;
  visibleChildrenCount: number;
  totalChildrenCount: number;
  activeAgentCount: number;
  enabledJobCount: number;
  inheritedAgentCount: number;
  inheritedJobCount: number;
  childCabinetPaths: string[];
  childCabinetNames: string[];
  visibleCabinetPaths: string[];
  visibleCabinetNames: string[];
};

export type ReportingSnapshotSummaryInput = Partial<ReportingSnapshotSummary> & {
  cabinetPath?: string | null;
  visibility?: string | null;
  itemCount?: number | null;
  visibleChildrenCount?: number | null;
  totalChildrenCount?: number | null;
  activeAgentCount?: number | null;
  enabledJobCount?: number | null;
  inheritedAgentCount?: number | null;
  inheritedJobCount?: number | null;
  childCabinetPaths?: readonly string[] | null;
  childCabinetNames?: readonly string[] | null;
  visibleCabinetPaths?: readonly string[] | null;
  visibleCabinetNames?: readonly string[] | null;
  pages?: number | null;
};

export const REPORTING_SNAPSHOT_SUMMARY_FIELDS = [
  "cabinetPath",
  "visibility",
  "itemCount",
  "visibleChildrenCount",
  "totalChildrenCount",
  "activeAgentCount",
  "enabledJobCount",
  "inheritedAgentCount",
  "inheritedJobCount",
  "childCabinetPaths",
  "childCabinetNames",
  "visibleCabinetPaths",
  "visibleCabinetNames",
] as const satisfies readonly (keyof ReportingSnapshotSummary)[];

export type ReportingSnapshotSummaryField =
  (typeof REPORTING_SNAPSHOT_SUMMARY_FIELDS)[number];

export type ReportingSnapshotSummaryRecord = Record<
  ReportingSnapshotSummaryField,
  ReportingSnapshotSummary[ReportingSnapshotSummaryField]
>;

export const REPORTING_SNAPSHOT_SUMMARY_DEFAULTS = {
  cabinetPath: "",
  visibility: "unknown",
  itemCount: 0,
  visibleChildrenCount: 0,
  totalChildrenCount: 0,
  activeAgentCount: 0,
  enabledJobCount: 0,
  inheritedAgentCount: 0,
  inheritedJobCount: 0,
  childCabinetPaths: [] as string[],
  childCabinetNames: [] as string[],
  visibleCabinetPaths: [] as string[],
  visibleCabinetNames: [] as string[],
} satisfies ReportingSnapshotSummaryRecord;

export const EMPTY_REPORTING_SNAPSHOT_SUMMARY: ReportingSnapshotSummary = {
  cabinetPath: REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.cabinetPath,
  visibility: REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.visibility,
  itemCount: REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.itemCount,
  visibleChildrenCount: REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.visibleChildrenCount,
  totalChildrenCount: REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.totalChildrenCount,
  activeAgentCount: REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.activeAgentCount,
  enabledJobCount: REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.enabledJobCount,
  inheritedAgentCount: REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.inheritedAgentCount,
  inheritedJobCount: REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.inheritedJobCount,
  childCabinetPaths: [...REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.childCabinetPaths],
  childCabinetNames: [...REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.childCabinetNames],
  visibleCabinetPaths: [...REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.visibleCabinetPaths],
  visibleCabinetNames: [...REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.visibleCabinetNames],
};


export type ReportingSnapshot = {
  companyId: string;
  parentCabinetId: string;
  childCabinetId: string;
  generatedAt: string;
  summary: ReportingSnapshotSummary;
};

export const REPORTING_SNAPSHOT_SUMMARY_SCHEMA_VERSION = 1 as const;

export type ReportingSnapshotSchema = {
  version: typeof REPORTING_SNAPSHOT_SUMMARY_SCHEMA_VERSION;
  generatedAt: string;
  summary: ReportingSnapshotSummary;
};

function normalizeReportingStringArray(value: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeReportingNumber(value: number | null | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toReportingSnapshotSummaryRecord(
  input: ReportingSnapshotSummaryInput = {},
): ReportingSnapshotSummary {
  const legacyPagesCount = normalizeReportingNumber(input.pages, 0);

  return {
    cabinetPath:
      typeof input.cabinetPath === "string"
        ? input.cabinetPath
        : REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.cabinetPath,
    visibility:
      typeof input.visibility === "string"
        ? input.visibility
        : REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.visibility,
    itemCount: normalizeReportingNumber(input.itemCount, legacyPagesCount),
    visibleChildrenCount: normalizeReportingNumber(
      input.visibleChildrenCount,
      REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.visibleChildrenCount,
    ),
    totalChildrenCount: normalizeReportingNumber(
      input.totalChildrenCount,
      REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.totalChildrenCount,
    ),
    activeAgentCount: normalizeReportingNumber(
      input.activeAgentCount,
      REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.activeAgentCount,
    ),
    enabledJobCount: normalizeReportingNumber(
      input.enabledJobCount,
      REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.enabledJobCount,
    ),
    inheritedAgentCount: normalizeReportingNumber(
      input.inheritedAgentCount,
      REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.inheritedAgentCount,
    ),
    inheritedJobCount: normalizeReportingNumber(
      input.inheritedJobCount,
      REPORTING_SNAPSHOT_SUMMARY_DEFAULTS.inheritedJobCount,
    ),
    childCabinetPaths: normalizeReportingStringArray(input.childCabinetPaths),
    childCabinetNames: normalizeReportingStringArray(input.childCabinetNames),
    visibleCabinetPaths: normalizeReportingStringArray(input.visibleCabinetPaths),
    visibleCabinetNames: normalizeReportingStringArray(input.visibleCabinetNames),
  };
}

export function buildReportingSnapshotSummary(
  input: ReportingSnapshotSummaryInput,
): ReportingSnapshotSummary {
  return {
    ...toReportingSnapshotSummaryRecord(input),
  };
}

export function buildReportingSnapshotSchema(input: {
  generatedAt: string;
  summary?: ReportingSnapshotSummaryInput | null;
}): ReportingSnapshotSchema {
  return {
    version: REPORTING_SNAPSHOT_SUMMARY_SCHEMA_VERSION,
    generatedAt: input.generatedAt,
    summary: buildReportingSnapshotSummary(input.summary ?? REPORTING_SNAPSHOT_SUMMARY_DEFAULTS),
  };
}

export function normalizeReportingSnapshot(
  snapshot: Pick<ReportingSnapshot, "companyId" | "parentCabinetId" | "childCabinetId" | "generatedAt"> & {
    summary?: ReportingSnapshotSummaryInput | null;
  },
): ReportingSnapshot {
  return {
    companyId: snapshot.companyId,
    parentCabinetId: snapshot.parentCabinetId,
    childCabinetId: snapshot.childCabinetId,
    generatedAt: snapshot.generatedAt,
    summary: buildReportingSnapshotSummary({
      cabinetPath:
        typeof snapshot.summary?.cabinetPath === "string"
          ? snapshot.summary.cabinetPath
          : snapshot.childCabinetId,
      visibility: typeof snapshot.summary?.visibility === "string" ? snapshot.summary.visibility : "private",
      ...snapshot.summary,
    }),
  };
}

const REPORTING_LINKS_FILE = "reporting-links.json";
const REPORTING_SNAPSHOTS_FILE = "reporting-snapshots.json";

async function ensureReportingDir(): Promise<string> {
  const dir = path.join(getManagedDataDir(), "reporting");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function readJsonArrayFile<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeJsonArrayFile<T>(filePath: string, value: T[]): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function createFileReportingRelationProvider(): ReportingRelationProvider {
  return {
    async listLinksByParentCabinet(parentCabinetId: string) {
      const filePath = path.join(await ensureReportingDir(), REPORTING_LINKS_FILE);
      const links = await readJsonArrayFile<CabinetReportingLink>(filePath);
      return links.filter((link) => link.parentCabinetId === parentCabinetId);
    },
    async listLinksByChildCabinet(childCabinetId: string) {
      const filePath = path.join(await ensureReportingDir(), REPORTING_LINKS_FILE);
      const links = await readJsonArrayFile<CabinetReportingLink>(filePath);
      return links.filter((link) => link.childCabinetId === childCabinetId);
    },
    async listLinksByCompany(companyId: string) {
      const filePath = path.join(await ensureReportingDir(), REPORTING_LINKS_FILE);
      const links = await readJsonArrayFile<CabinetReportingLink>(filePath);
      return links.filter((link) => link.companyId === companyId);
    },
    async createLink(link: CabinetReportingLink) {
      const filePath = path.join(await ensureReportingDir(), REPORTING_LINKS_FILE);
      const links = await readJsonArrayFile<CabinetReportingLink>(filePath);
      links.push(link);
      await writeJsonArrayFile(filePath, links);
      return link;
    },
    async updateLinkStatus(input) {
      const filePath = path.join(await ensureReportingDir(), REPORTING_LINKS_FILE);
      const links = await readJsonArrayFile<CabinetReportingLink>(filePath);
      const index = links.findIndex((link) => link.id === input.linkId);
      if (index === -1) {
        throw new ReportingRelationValidationError(
          "link_not_found",
          `Reporting link '${input.linkId}' not found`,
        );
      }
      const updated = {
        ...links[index],
        status: input.status,
        updatedAt: input.updatedAt,
      };
      links[index] = updated;
      await writeJsonArrayFile(filePath, links);
      return updated;
    },
  };
}

export function createFileReportingSnapshotProvider(): ReportingSnapshotProvider {
  return {
    async listSnapshotsForParent(input) {
      const filePath = path.join(await ensureReportingDir(), REPORTING_SNAPSHOTS_FILE);
      const snapshots = await readJsonArrayFile<CabinetReportingSnapshot>(filePath);
      const allowedChildIds = new Set(input.childCabinetIds);
      return snapshots
        .filter(
          (snapshot) =>
            snapshot.companyId === input.companyId &&
            snapshot.parentCabinetId === input.parentCabinetId &&
            allowedChildIds.has(snapshot.childCabinetId),
        )
        .map(normalizeReportingSnapshot);
    },
    async upsertSnapshots(nextSnapshots) {
      const filePath = path.join(await ensureReportingDir(), REPORTING_SNAPSHOTS_FILE);
      const existing = await readJsonArrayFile<CabinetReportingSnapshot>(filePath);
      const replacementKeys = new Set(
        nextSnapshots.map(
          (snapshot) => `${snapshot.companyId}::${snapshot.parentCabinetId}::${snapshot.childCabinetId}`,
        ),
      );
      const merged = [
        ...existing.filter(
          (snapshot) =>
            !replacementKeys.has(
              `${snapshot.companyId}::${snapshot.parentCabinetId}::${snapshot.childCabinetId}`,
            ),
        ),
        ...nextSnapshots,
      ];
      await writeJsonArrayFile(filePath, merged);
    },
  };
}

export type CreateCabinetReportingLinkInput = {
  companyId: string;
  parentCabinetId: string;
  parentCabinetPath?: string | null;
  childCabinetId: string;
  childCabinetPath?: string | null;
  actor: Actor;
};

export type UpdateCabinetReportingLinkStatusInput = {
  linkId: string;
  status: CabinetReportingLinkStatus;
  actor: Actor;
};

export interface ReportingRelationProvider {
  listLinksByParentCabinet(parentCabinetId: string): Promise<CabinetReportingLink[]>;
  listLinksByChildCabinet(childCabinetId: string): Promise<CabinetReportingLink[]>;
  listLinksByCompany(companyId: string): Promise<CabinetReportingLink[]>;
  createLink(link: CabinetReportingLink): Promise<CabinetReportingLink>;
  updateLinkStatus(input: {
    linkId: string;
    status: CabinetReportingLinkStatus;
    updatedAt: string;
  }): Promise<CabinetReportingLink>;
}

export type ReportingRelationValidationErrorCode =
  | "invalid_company"
  | "invalid_cabinet"
  | "self_link"
  | "cross_company"
  | "duplicate_active_parent"
  | "reporting_cycle"
  | "link_not_found"
  | "unsupported_actor";

export class ReportingRelationValidationError extends Error {
  code: ReportingRelationValidationErrorCode;

  constructor(code: ReportingRelationValidationErrorCode, message: string) {
    super(message);
    this.name = "ReportingRelationValidationError";
    this.code = code;
  }
}

export type CabinetOwnershipRef = CabinetOwnership;

export type CompanyOwnershipRef = CompanyOwnership;

export interface CabinetOwnershipProvider {
  getCabinet(input: { cabinetId: string }): Promise<CabinetOwnershipRef | null>;
}

const defaultCabinetOwnershipProvider: CabinetOwnershipProvider = {
  async getCabinet() {
    return null;
  },
};

let activeCabinetOwnershipProvider: CabinetOwnershipProvider = defaultCabinetOwnershipProvider;

export async function resolveCabinetOwnership(input: {
  cabinetId: string;
  cabinetPath?: string | null;
  companyId?: string | null;
  cabinetOwnershipProvider?: CabinetOwnershipProvider;
}): Promise<CabinetOwnershipRef | null> {
  const provider = input.cabinetOwnershipProvider ?? activeCabinetOwnershipProvider;
  const directOwnership = await provider.getCabinet({ cabinetId: input.cabinetId });
  if (directOwnership) {
    return directOwnership;
  }

  if (!input.cabinetPath) {
    return null;
  }

  try {
    const overview = await readCabinetOverview(input.cabinetPath);
    const manifestCabinetId = overview.cabinet.id?.trim();
    if (manifestCabinetId) {
      const manifestOwnership = await provider.getCabinet({ cabinetId: manifestCabinetId });
      if (manifestOwnership) {
        return manifestOwnership;
      }
      if (input.companyId?.trim()) {
        return {
          cabinetId: manifestCabinetId,
          companyId: input.companyId.trim(),
        };
      }
    }
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Cabinet not found:")) {
      throw error;
    }
  }

  const ownership = await resolveOwnershipChainFromVirtualPath(input.cabinetPath);
  if (!ownership.cabinetId) {
    return null;
  }

  const resolvedCompanyId = ownership.companyId ?? input.companyId?.trim() ?? null;
  if (!resolvedCompanyId) {
    return null;
  }

  return {
    cabinetId: ownership.cabinetId,
    companyId: resolvedCompanyId,
  };
}

function normalizeCabinetId(value: string): string {
  return value.trim();
}

function normalizeCompanyId(value: string): string {
  return value.trim();
}

function assertSupportedActor(actor: Actor): asserts actor is Extract<Actor, { kind: "user" }> {
  if (actor.kind !== "user") {
    throw new ReportingRelationValidationError("unsupported_actor", "Reporting link mutations require a user actor");
  }
}

function validateCreateInput(input: CreateCabinetReportingLinkInput): {
  companyId: string;
  parentCabinetId: string;
  childCabinetId: string;
} {
  const companyId = normalizeCompanyId(input.companyId);
  const parentCabinetId = normalizeCabinetId(input.parentCabinetId);
  const childCabinetId = normalizeCabinetId(input.childCabinetId);

  if (!companyId) {
    throw new ReportingRelationValidationError("invalid_company", "Reporting links require a companyId");
  }

  if (!parentCabinetId || !childCabinetId) {
    throw new ReportingRelationValidationError(
      "invalid_cabinet",
      "Reporting links require both parent and child cabinet ids",
    );
  }

  return { companyId, parentCabinetId, childCabinetId };
}

function validateNoSelfLink(parentCabinetId: string, childCabinetId: string): void {
  if (parentCabinetId === childCabinetId) {
    throw new ReportingRelationValidationError("self_link", "A cabinet cannot report to itself");
  }
}

function validateCabinetOwnershipForReportingLink(input: {
  companyId: string;
  parentCabinetId: string;
  childCabinetId: string;
  parentCabinet: CabinetOwnershipRef | null;
  childCabinet: CabinetOwnershipRef | null;
}): void {
  const { companyId, parentCabinetId, childCabinetId, parentCabinet, childCabinet } = input;

  if (!parentCabinet || !childCabinet) {
    throw new ReportingRelationValidationError(
      "invalid_cabinet",
      `Reporting links require both cabinets to resolve ownership (${parentCabinetId} -> ${childCabinetId})`,
    );
  }

  if (
    parentCabinet.companyId !== companyId ||
    childCabinet.companyId !== companyId ||
    parentCabinet.companyId !== childCabinet.companyId
  ) {
    throw new ReportingRelationValidationError(
      "cross_company",
      "Reporting links must stay within a single company",
    );
  }
}

function validateNoDuplicateActiveParent(input: {
  links: CabinetReportingLink[];
  parentCabinetId: string;
  childCabinetId: string;
}): void {
  if (
    input.links.some(
      (link) =>
        link.status === "active" &&
        link.childCabinetId === input.childCabinetId &&
        link.parentCabinetId !== input.parentCabinetId,
    )
  ) {
    throw new ReportingRelationValidationError(
      "duplicate_active_parent",
      `Child cabinet ${input.childCabinetId} already has an active reporting parent`,
    );
  }

  if (
    input.links.some(
      (link) =>
        link.status === "active" &&
        link.parentCabinetId === input.parentCabinetId &&
        link.childCabinetId === input.childCabinetId,
    )
  ) {
    throw new ReportingRelationValidationError(
      "duplicate_active_parent",
      `Reporting link ${input.parentCabinetId} -> ${input.childCabinetId} already exists`,
    );
  }
}

function detectCycle(input: {
  links: CabinetReportingLink[];
  nextParentCabinetId: string;
  nextChildCabinetId: string;
}): boolean {
  const activeLinks = input.links.filter((link) => link.status === "active");
  const childrenByParent = new Map<string, string[]>();

  for (const link of activeLinks) {
    const children = childrenByParent.get(link.parentCabinetId) ?? [];
    children.push(link.childCabinetId);
    childrenByParent.set(link.parentCabinetId, children);
  }

  const nextChildren = childrenByParent.get(input.nextParentCabinetId) ?? [];
  nextChildren.push(input.nextChildCabinetId);
  childrenByParent.set(input.nextParentCabinetId, nextChildren);

  const stack = [input.nextChildCabinetId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const cabinetId = stack.pop();
    if (!cabinetId || visited.has(cabinetId)) {
      continue;
    }
    if (cabinetId === input.nextParentCabinetId) {
      return true;
    }
    visited.add(cabinetId);
    for (const childId of childrenByParent.get(cabinetId) ?? []) {
      stack.push(childId);
    }
  }

  return false;
}

export type ReportingRelationService = {
  createLink(input: CreateCabinetReportingLinkInput): Promise<CabinetReportingLink>;
  listLinksForCabinet(input: { companyId: string; cabinetId: string }): Promise<CabinetReportingLink[]>;
  updateLinkStatus(input: UpdateCabinetReportingLinkStatusInput): Promise<CabinetReportingLink>;
};

export type ReportingLinkScope = {
  companyId: string;
  parentCabinetId: string;
  parentCabinetPath: string | null;
  links: CabinetReportingLink[];
  activeLinks: CabinetReportingLink[];
  activeChildCabinetIds: string[];
};

export function buildReportingLinkScope(input: {
  companyId: string;
  parentCabinetId: string;
  parentCabinetPath?: string | null;
  links: CabinetReportingLink[];
}): ReportingLinkScope {
  const companyId = normalizeCompanyId(input.companyId);
  const parentCabinetId = normalizeCabinetId(input.parentCabinetId);
  const parentCabinetPath = input.parentCabinetPath?.trim() || null;
  const links = input.links.filter((link) => link.companyId === companyId);
  const activeLinks = links.filter(
    (link) => link.parentCabinetId === parentCabinetId && link.status === "active",
  );

  return {
    companyId,
    parentCabinetId,
    parentCabinetPath,
    links,
    activeLinks,
    activeChildCabinetIds: activeLinks.map((link) => link.childCabinetId),
  };
}

export function createReportingRelationService(input: {
  provider: ReportingRelationProvider;
  cabinetOwnershipProvider?: CabinetOwnershipProvider;
}): ReportingRelationService {
  const cabinetOwnershipProvider = input.cabinetOwnershipProvider ?? defaultCabinetOwnershipProvider;

  return {
    async createLink(createInput) {
      assertSupportedActor(createInput.actor);
      const {
        companyId,
        parentCabinetId: requestedParentCabinetId,
        childCabinetId: requestedChildCabinetId,
      } = validateCreateInput(createInput);
      const [existingLinks, parentCabinet, childCabinet] = await Promise.all([
        input.provider.listLinksByCompany(companyId),
        resolveCabinetOwnership({
          cabinetId: requestedParentCabinetId,
          cabinetPath: createInput.parentCabinetPath,
          companyId,
          cabinetOwnershipProvider,
        }),
        resolveCabinetOwnership({
          cabinetId: requestedChildCabinetId,
          cabinetPath: createInput.childCabinetPath,
          companyId,
          cabinetOwnershipProvider,
        }),
      ]);

      const parentCabinetId = parentCabinet?.cabinetId ?? requestedParentCabinetId;
      const childCabinetId = childCabinet?.cabinetId ?? requestedChildCabinetId;

      validateNoSelfLink(parentCabinetId, childCabinetId);

      validateCabinetOwnershipForReportingLink({
        companyId,
        parentCabinetId,
        childCabinetId,
        parentCabinet,
        childCabinet,
      });

      validateNoDuplicateActiveParent({
        links: existingLinks,
        parentCabinetId,
        childCabinetId,
      });

      if (
        detectCycle({
          links: existingLinks,
          nextParentCabinetId: parentCabinetId,
          nextChildCabinetId: childCabinetId,
        })
      ) {
        throw new ReportingRelationValidationError(
          "reporting_cycle",
          `Reporting link ${parentCabinetId} -> ${childCabinetId} would create a cycle`,
        );
      }

      const timestamp = new Date().toISOString();
      return input.provider.createLink({
        id: `reporting-link-${companyId}-${parentCabinetId}-${childCabinetId}-${existingLinks.length + 1}`,
        companyId,
        parentCabinetId,
        childCabinetId,
        status: "active",
        createdBy: createInput.actor.userId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    },
    async listLinksForCabinet(listInput) {
      const companyId = normalizeCompanyId(listInput.companyId);
      const cabinetId = normalizeCabinetId(listInput.cabinetId);
      const links = await input.provider.listLinksByCompany(companyId);
      return links.filter(
        (link) => link.parentCabinetId === cabinetId || link.childCabinetId === cabinetId,
      );
    },
    async updateLinkStatus(updateInput) {
      assertSupportedActor(updateInput.actor);
      const updatedAt = new Date().toISOString();
      return input.provider.updateLinkStatus({
        linkId: updateInput.linkId.trim(),
        status: updateInput.status,
        updatedAt,
      });
    },
  };
}

export function createInMemoryReportingRelationProvider(
  initialLinks: CabinetReportingLink[] = [],
): ReportingRelationProvider {
  let links = [...initialLinks];

  return {
    async listLinksByParentCabinet(parentCabinetId) {
      return links.filter((link) => link.parentCabinetId === parentCabinetId);
    },
    async listLinksByChildCabinet(childCabinetId) {
      return links.filter((link) => link.childCabinetId === childCabinetId);
    },
    async listLinksByCompany(companyId) {
      return links.filter((link) => link.companyId === companyId);
    },
    async createLink(link) {
      links = [...links, link];
      return link;
    },
    async updateLinkStatus(input) {
      const current = links.find((link) => link.id === input.linkId);
      if (!current) {
        throw new ReportingRelationValidationError("link_not_found", `Reporting link ${input.linkId} was not found`);
      }

      const updated = {
        ...current,
        status: input.status,
        updatedAt: input.updatedAt,
      };
      links = links.map((link) => (link.id === current.id ? updated : link));
      return updated;
    },
  };
}

const defaultReportingRelationProvider = createFileReportingRelationProvider();
let activeReportingRelationProvider: ReportingRelationProvider = defaultReportingRelationProvider;
const defaultReportingRelationService = createReportingRelationService({ provider: activeReportingRelationProvider });
let activeReportingRelationService: ReportingRelationService = defaultReportingRelationService;

export function setCabinetOwnershipProvider(provider: CabinetOwnershipProvider): void {
  activeCabinetOwnershipProvider = provider;
  activeReportingRelationService = createReportingRelationService({
    provider: activeReportingRelationProvider,
    cabinetOwnershipProvider: activeCabinetOwnershipProvider,
  });
  activeReportingReadService = createReportingReadService({
    relationService: activeReportingRelationService,
    snapshotProvider: activeReportingSnapshotProvider,
  });
}

export function resetCabinetOwnershipProvider(): void {
  activeCabinetOwnershipProvider = defaultCabinetOwnershipProvider;
  activeReportingRelationService = createReportingRelationService({
    provider: activeReportingRelationProvider,
    cabinetOwnershipProvider: activeCabinetOwnershipProvider,
  });
  activeReportingReadService = createReportingReadService({
    relationService: activeReportingRelationService,
    snapshotProvider: activeReportingSnapshotProvider,
  });
}

export function setReportingRelationProvider(provider: ReportingRelationProvider): void {
  activeReportingRelationProvider = provider;
  activeReportingRelationService = createReportingRelationService({
    provider,
    cabinetOwnershipProvider: activeCabinetOwnershipProvider,
  });
  activeReportingReadService = createReportingReadService({
    relationService: activeReportingRelationService,
    snapshotProvider: activeReportingSnapshotProvider,
  });
}

export function resetReportingRelationProvider(): void {
  activeReportingRelationProvider = defaultReportingRelationProvider;
  activeReportingRelationService = createReportingRelationService({
    provider: activeReportingRelationProvider,
    cabinetOwnershipProvider: activeCabinetOwnershipProvider,
  });
  activeReportingReadService = createReportingReadService({
    relationService: activeReportingRelationService,
    snapshotProvider: activeReportingSnapshotProvider,
  });
}

export function getReportingRelationService(): ReportingRelationService {
  return activeReportingRelationService;
}

export type CabinetReportingSnapshot = {
  childCabinetId: string;
  parentCabinetId: string;
  companyId: string;
  summary: ReportingSnapshotSummaryInput;
  generatedAt: string;
};

export interface ReportingSnapshotProvider {
  listSnapshotsForParent(input: {
    companyId: string;
    parentCabinetId: string;
    childCabinetIds: string[];
  }): Promise<CabinetReportingSnapshot[]>;
  upsertSnapshots?(snapshots: CabinetReportingSnapshot[]): Promise<void>;
}

export type ReportingSnapshotRefreshResult = {
  scope: ReportingLinkScope;
  snapshots: CabinetReportingSnapshot[];
};

export type ReportingSnapshotRefreshService = {
  refreshSnapshotsForParent(input: {
    companyId: string;
    parentCabinetId: string;
    parentCabinetPath?: string | null;
  }): Promise<ReportingSnapshotRefreshResult>;
};

export type ReportingReadResult = {
  scope: ReportingLinkScope;
  snapshots: CabinetReportingSnapshot[];
};

export type ReportingReadService = {
  getReportingForParent(input: {
    companyId: string;
    parentCabinetId: string;
    parentCabinetPath?: string | null;
    actor: Actor;
    companyContext: CompanyContext;
    cabinetContext?: CabinetContext | null;
  }): Promise<ReportingReadResult>;
};

export type ReportingScopeValidationInput = {
  companyId: string;
  parentCabinetId: string;
  parentCabinetPath?: string | null;
  companyContext: CompanyContext;
  cabinetContext?: CabinetContext | null;
};

export async function validateReportingScopeAlignment(
  input: ReportingScopeValidationInput,
): Promise<AuthorizationDecision | null> {
  const companyId = normalizeCompanyId(input.companyId);
  const parentCabinetId = normalizeCabinetId(input.parentCabinetId);
  const parentOwnership = input.parentCabinetPath
    ? await resolveOwnershipChainFromVirtualPath(input.parentCabinetPath)
    : null;
  const activeCompanyId = input.companyContext.companyId ?? null;
  const activeCabinetId = input.cabinetContext?.cabinetId ?? null;

  if (input.companyContext.denyReason === "company_mismatch") {
    return {
      allowed: false,
      reason: "company_mismatch",
      message: input.companyContext.denyMessage ?? "Access denied — company context mismatch",
      status: 403,
    };
  }

  if (input.cabinetContext?.denyReason === "cabinet_mismatch") {
    return {
      allowed: false,
      reason: "cabinet_mismatch",
      message: input.cabinetContext.denyMessage ?? "Access denied — cabinet context mismatch",
      status: 403,
    };
  }

  if (activeCompanyId && companyId && activeCompanyId !== companyId) {
    return {
      allowed: false,
      reason: "company_mismatch",
      message: "Requested reporting scope belongs to a different company than the active company",
      status: 403,
    };
  }

  if (
    parentOwnership &&
    parentOwnership.companyId &&
    companyId &&
    parentOwnership.companyId !== companyId
  ) {
    return {
      allowed: false,
      reason: "company_mismatch",
      message: "Requested reporting scope path belongs to a different company than the reporting company",
      status: 403,
    };
  }

  if (activeCabinetId && parentCabinetId && activeCabinetId !== parentCabinetId) {
    return {
      allowed: false,
      reason: "cabinet_mismatch",
      message: "Requested reporting scope belongs to a different cabinet than the active cabinet",
      status: 403,
    };
  }

  if (
    parentOwnership &&
    parentOwnership.cabinetId &&
    parentCabinetId &&
    parentOwnership.cabinetId !== parentCabinetId
  ) {
    return {
      allowed: false,
      reason: "cabinet_mismatch",
      message: "Requested reporting scope path belongs to a different cabinet than the reporting parent cabinet",
      status: 403,
    };
  }

  return null;
}

export function createInMemoryReportingSnapshotProvider(
  initialSnapshots: CabinetReportingSnapshot[] = [],
): ReportingSnapshotProvider {
  let snapshots = [...initialSnapshots];

  return {
    async listSnapshotsForParent(input) {
      const allowedChildIds = new Set(input.childCabinetIds);
      return snapshots
        .filter(
          (snapshot) =>
            snapshot.companyId === input.companyId &&
            snapshot.parentCabinetId === input.parentCabinetId &&
            allowedChildIds.has(snapshot.childCabinetId),
        )
        .map(normalizeReportingSnapshot);
    },
    async upsertSnapshots(nextSnapshots) {
      const replacementKeys = new Set(
        nextSnapshots.map(
          (snapshot) => `${snapshot.companyId}::${snapshot.parentCabinetId}::${snapshot.childCabinetId}`,
        ),
      );
      snapshots = [
        ...snapshots.filter(
          (snapshot) =>
            !replacementKeys.has(
              `${snapshot.companyId}::${snapshot.parentCabinetId}::${snapshot.childCabinetId}`,
            ),
        ),
        ...nextSnapshots,
      ];
    },
  };
}

const defaultReportingSnapshotProvider = createFileReportingSnapshotProvider();
let activeReportingSnapshotProvider: ReportingSnapshotProvider = defaultReportingSnapshotProvider;
const defaultReportingSnapshotRefreshService = createReportingSnapshotRefreshService({
  relationService: activeReportingRelationService,
  snapshotProvider: activeReportingSnapshotProvider,
});
let activeReportingSnapshotRefreshService: ReportingSnapshotRefreshService =
  defaultReportingSnapshotRefreshService;

export function setReportingSnapshotProvider(provider: ReportingSnapshotProvider): void {
  activeReportingSnapshotProvider = provider;
  activeReportingSnapshotRefreshService = createReportingSnapshotRefreshService({
    relationService: activeReportingRelationService,
    snapshotProvider: activeReportingSnapshotProvider,
  });
  activeReportingReadService = createReportingReadService({
    relationService: activeReportingRelationService,
    snapshotProvider: activeReportingSnapshotProvider,
  });
}

export function resetReportingSnapshotProvider(): void {
  activeReportingSnapshotProvider = defaultReportingSnapshotProvider;
  activeReportingSnapshotRefreshService = createReportingSnapshotRefreshService({
    relationService: activeReportingRelationService,
    snapshotProvider: activeReportingSnapshotProvider,
  });
  activeReportingReadService = createReportingReadService({
    relationService: activeReportingRelationService,
    snapshotProvider: activeReportingSnapshotProvider,
  });
}

function toReportingResourceContext(input: {
  companyId: string;
  parentCabinetId: string;
}): PageResourceContext {
  return {
    resourceType: "page",
    virtualPath: `reporting/${input.parentCabinetId}`,
    pageId: null,
    ownerUsername: null,
    visibility: "public",
    requiresPageContext: false,
    requiresCabinetContext: true,
    companyId: input.companyId,
    cabinetId: input.parentCabinetId,
  };
}

export function createReportingSnapshotRefreshService(input: {
  relationService: ReportingRelationService;
  snapshotProvider: ReportingSnapshotProvider;
}): ReportingSnapshotRefreshService {
  return {
    async refreshSnapshotsForParent(refreshInput) {
      const scopeDecision = await validateReportingScopeAlignment({
        companyId: refreshInput.companyId,
        parentCabinetId: refreshInput.parentCabinetId,
        parentCabinetPath: refreshInput.parentCabinetPath,
        companyContext: {
          companyId: refreshInput.companyId,
          source: "request",
          requestCompanyId: refreshInput.companyId,
          workspaceCompanyId: null,
          membershipCompanyIds: [refreshInput.companyId],
          membershipDefaultCompanyId: refreshInput.companyId,
          membershipRoleByCompanyId: {},
        },
        cabinetContext: null,
      });
      if (scopeDecision) {
        const error = new Error(scopeDecision.message ?? scopeDecision.reason ?? "Reporting scope refresh denied") as Error & {
          decision?: AuthorizationDecision;
        };
        error.decision = scopeDecision;
        throw error;
      }

      const scope = buildReportingLinkScope({
        companyId: refreshInput.companyId,
        parentCabinetId: refreshInput.parentCabinetId,
        parentCabinetPath: refreshInput.parentCabinetPath,
        links: await input.relationService.listLinksForCabinet({
          companyId: refreshInput.companyId,
          cabinetId: refreshInput.parentCabinetId,
        }),
      });

      const existingSnapshots = await input.snapshotProvider.listSnapshotsForParent({
        companyId: scope.companyId,
        parentCabinetId: scope.parentCabinetId,
        childCabinetIds: scope.activeChildCabinetIds,
      });
      const existingByChildId = new Map(
        existingSnapshots.map((snapshot) => [snapshot.childCabinetId, snapshot] as const),
      );

      const generatedAt = new Date().toISOString();
      const snapshots = await Promise.all(
        scope.activeLinks.map(async (link) => {
          try {
            const overview = await readCabinetOverview(link.childCabinetId);
            return {
              companyId: scope.companyId,
              parentCabinetId: scope.parentCabinetId,
              childCabinetId: link.childCabinetId,
              generatedAt,
              summary: buildReportingSnapshotSummary({
                cabinetPath: overview.cabinet.path,
                visibility: overview.visibilityMode,
                itemCount: overview.agents.length + overview.jobs.length,
                visibleChildrenCount: overview.visibleCabinets.length,
                totalChildrenCount: overview.children.length,
                activeAgentCount: overview.agents.filter((agent) => agent.active).length,
                enabledJobCount: overview.jobs.filter((job) => job.enabled).length,
                inheritedAgentCount: overview.agents.filter((agent) => agent.inherited).length,
                inheritedJobCount: overview.jobs.filter((job) => job.inherited).length,
                childCabinetPaths: overview.children.map((child) => child.path),
                childCabinetNames: overview.children.map((child) => child.name),
                visibleCabinetPaths: overview.visibleCabinets.map((child) => child.path),
                visibleCabinetNames: overview.visibleCabinets.map((child) => child.name),
              }),
            } satisfies CabinetReportingSnapshot;
          } catch {
            return normalizeReportingSnapshot(
              existingByChildId.get(link.childCabinetId) ?? {
                companyId: scope.companyId,
                parentCabinetId: scope.parentCabinetId,
                childCabinetId: link.childCabinetId,
                generatedAt,
                summary: buildReportingSnapshotSummary({
                  cabinetPath: link.childCabinetId,
                  visibility: "private",
                }),
              },
            );
          }
        }),
      );

      await input.snapshotProvider.upsertSnapshots?.(snapshots);
      return {
        scope,
        snapshots,
      };
    },
  };
}

export function createReportingReadService(input: {
  relationService: ReportingRelationService;
  snapshotProvider: ReportingSnapshotProvider;
}): ReportingReadService {
  return {
    async getReportingForParent(readInput) {
      const { companyId, parentCabinetId, parentCabinetPath, actor, companyContext, cabinetContext } = readInput;
      const scopeDecision = await validateReportingScopeAlignment({
        companyId,
        parentCabinetId,
        parentCabinetPath,
        companyContext,
        cabinetContext,
      });
      if (scopeDecision) {
        const error = new Error(scopeDecision.message ?? scopeDecision.reason ?? "Reporting scope access denied") as Error & {
          decision?: AuthorizationDecision;
        };
        error.decision = scopeDecision;
        throw error;
      }

      const authorization = await authorizeUserAction({
        actor,
        companyContext,
        cabinetContext,
        action: "read_reporting",
        resourceContext: toReportingResourceContext({ companyId, parentCabinetId }),
      });

      if (!authorization.allowed) {
        const error = new Error(authorization.message ?? authorization.reason ?? "Reporting access denied") as Error & {
          decision?: AuthorizationDecision;
        };
        error.decision = authorization;
        throw error;
      }

      const scope = buildReportingLinkScope({
        companyId,
        parentCabinetId,
        parentCabinetPath,
        links: await input.relationService.listLinksForCabinet({
          companyId,
          cabinetId: parentCabinetId,
        }),
      });

      const snapshots = await input.snapshotProvider.listSnapshotsForParent({
        companyId: scope.companyId,
        parentCabinetId: scope.parentCabinetId,
        childCabinetIds: scope.activeChildCabinetIds,
      });

      return {
        scope,
        snapshots,
      };
    },
  };
}

const defaultReportingReadService = createReportingReadService({
  relationService: activeReportingRelationService,
  snapshotProvider: activeReportingSnapshotProvider,
});
let activeReportingReadService: ReportingReadService = defaultReportingReadService;

export function resetReportingReadService(): void {
  activeReportingSnapshotRefreshService = createReportingSnapshotRefreshService({
    relationService: activeReportingRelationService,
    snapshotProvider: activeReportingSnapshotProvider,
  });
  activeReportingReadService = createReportingReadService({
    relationService: activeReportingRelationService,
    snapshotProvider: activeReportingSnapshotProvider,
  });
}

export function getReportingSnapshotRefreshService(): ReportingSnapshotRefreshService {
  return activeReportingSnapshotRefreshService;
}

export function getReportingReadService(): ReportingReadService {
  return activeReportingReadService;
}
