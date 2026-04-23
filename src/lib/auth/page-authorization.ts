import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { dirname, join } from "path";
import { readPageMeta } from "@/lib/storage/page-io";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { getRequestUser } from "./request-user";

export type AuthorizationAction =
  | "read_raw"
  | "write_raw"
  | "delete_raw"
  | "admin_raw"
  | "read_reporting"
  | "manage_reporting";

export type CabinetRole = "cabinet_admin" | "cabinet_editor" | "cabinet_viewer";

export type CabinetAction =
  | "cabinet_read"
  | "cabinet_write"
  | "cabinet_admin"
  | "cabinet_reporting_read"
  | "cabinet_reporting_manage";

export type CabinetResourceMapping = {
  cabinetId: string;
  companyId: string;
};

export interface CabinetResourceMappingProvider {
  resolveCabinetForPage(virtualPath: string): Promise<CabinetResourceMapping | null>;
}

export type AdminAuthorizationResult = {
  allowed: boolean;
  reason?: string;
  status?: 401 | 403;
};

export type AnonymousAccessPolicy = {
  allowAnonymousRead: boolean;
};

const DEFAULT_ANONYMOUS_ACCESS_POLICY: AnonymousAccessPolicy = {
  allowAnonymousRead: true,
};

const COMPANY_CONFIG_PATH = join(DATA_DIR, ".agents", ".config", "company.json");

const defaultCompanyMembershipProvider: CompanyMembershipProvider = {
  async getMemberships(actor) {
    if (actor.kind === "anonymous") {
      return {
        memberships: [],
        defaultCompanyId: null,
      };
    }

    return {
      memberships: [],
      defaultCompanyId: null,
    };
  },
};

const defaultCabinetMembershipProvider: CabinetMembershipProvider = {
  async getMemberships() {
    return {
      memberships: [],
      defaultCabinetId: null,
    };
  },
};

const defaultCabinetResourceMappingProvider: CabinetResourceMappingProvider = {
  async resolveCabinetForPage() {
    return null;
  },
};

let activeCompanyMembershipProvider: CompanyMembershipProvider = defaultCompanyMembershipProvider;
let activeCabinetMembershipProvider: CabinetMembershipProvider = defaultCabinetMembershipProvider;
let activeCabinetResourceMappingProvider: CabinetResourceMappingProvider = defaultCabinetResourceMappingProvider;

export type Actor =
  | { kind: "anonymous" }
  | {
      kind: "user";
      userId: string;
      username: string;
      role: string;
    };

export type CompanyRole = "company_admin" | "company_member";

export type CompanyMembershipRef = {
  companyId: string;
  isDefault?: boolean;
  role?: CompanyRole | string;
};

export type CompanyOwnership = {
  companyId: string;
};

export type CabinetOwnership = CompanyOwnership & {
  cabinetId: string;
};

export type CabinetMembershipAccess = {
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
  canReadReporting: boolean;
  canManageReporting: boolean;
};

export type CabinetCapabilityMatrix = Record<CabinetAction, keyof CabinetMembershipAccess>;

export type CabinetMembershipRef = CabinetOwnership & {
  role: CabinetRole;
  isDefault?: boolean;
};

export type ActiveCompanyResolution = {
  companyId: string | null;
  source: CompanyContext["source"];
  denyReason?: CompanyContext["denyReason"];
  denyMessage?: string;
};

export type ActiveCabinetResolution = {
  cabinetId: string | null;
  source: CabinetContext["source"];
  companyId: string | null;
  denyReason?: CabinetContext["denyReason"];
  denyMessage?: string;
};

export type ResourceOwnershipChain = {
  resourceType: "page";
  virtualPath: string;
  companyId: string | null;
  cabinetId: string | null;
  source: "none" | "resource_mapping";
};

export type OwnershipValidationResult = {
  companyMatchesActiveCompany: boolean;
  cabinetMatchesActiveCabinet: boolean;
  mismatchReason?: AuthorizationDecision["reason"];
  mismatchMessage?: string;
};

export type OwnedPageResourceContext = PageResourceContext & {
  ownership: ResourceOwnershipChain;
};

export function buildResourceOwnershipChain(input: {
  virtualPath: string;
  mapping?: CabinetResourceMapping | null;
}): ResourceOwnershipChain {
  return {
    resourceType: "page",
    virtualPath: input.virtualPath,
    companyId: input.mapping?.companyId ?? null,
    cabinetId: input.mapping?.cabinetId ?? null,
    source: input.mapping ? "resource_mapping" : "none",
  };
}

export function attachOwnershipToPageResourceContext(
  resourceContext: PageResourceContext,
  ownership: ResourceOwnershipChain,
): OwnedPageResourceContext {
  return {
    ...resourceContext,
    companyId: ownership.companyId,
    cabinetId: ownership.cabinetId,
    ownership,
  };
}

export function isOwnedPageResourceContext(resourceContext: PageResourceContext): resourceContext is OwnedPageResourceContext {
  return "ownership" in resourceContext && !!resourceContext.ownership;
}

export function resolveOwnershipChainFromPageResource(
  resourceContext: Pick<PageResourceContext, "resourceType" | "virtualPath" | "companyId" | "cabinetId">,
): ResourceOwnershipChain {
  return {
    resourceType: resourceContext.resourceType,
    virtualPath: resourceContext.virtualPath,
    companyId: resourceContext.companyId ?? null,
    cabinetId: resourceContext.cabinetId ?? null,
    source:
      resourceContext.companyId || resourceContext.cabinetId
        ? "resource_mapping"
        : "none",
  };
}

export function validateResourceOwnershipAlignment(input: {
  ownership: ResourceOwnershipChain;
  companyContext: CompanyContext;
  cabinetContext?: CabinetContext | null;
}): OwnershipValidationResult {
  const { ownership, companyContext, cabinetContext = null } = input;
  const activeCompanyId = companyContext.companyId ?? null;
  const activeCabinetId = cabinetContext?.cabinetId ?? null;

  if (ownership.companyId && activeCompanyId && ownership.companyId !== activeCompanyId) {
    return {
      companyMatchesActiveCompany: false,
      cabinetMatchesActiveCabinet: ownership.cabinetId ? ownership.cabinetId === activeCabinetId : true,
      mismatchReason: "company_mismatch",
      mismatchMessage: "Requested resource belongs to a different company than the active company",
    };
  }

  if (ownership.cabinetId && activeCabinetId && ownership.cabinetId !== activeCabinetId) {
    return {
      companyMatchesActiveCompany: ownership.companyId ? ownership.companyId === activeCompanyId : true,
      cabinetMatchesActiveCabinet: false,
      mismatchReason: "cabinet_mismatch",
      mismatchMessage: "Requested resource belongs to a different cabinet than the active cabinet",
    };
  }

  return {
    companyMatchesActiveCompany: true,
    cabinetMatchesActiveCabinet: true,
  };
}

export type AuthorizationSubjectContext = {
  actor: Actor;
  company: ActiveCompanyResolution;
  cabinet: ActiveCabinetResolution;
  companyMemberships: CompanyMembershipRef[];
  cabinetMemberships: CabinetMembershipRef[];
};

export function getCabinetMembershipAccess(role: CabinetRole): CabinetMembershipAccess {
  switch (role) {
    case "cabinet_admin":
      return {
        canRead: true,
        canWrite: true,
        canAdmin: true,
        canReadReporting: true,
        canManageReporting: true,
      };
    case "cabinet_editor":
      return {
        canRead: true,
        canWrite: true,
        canAdmin: false,
        canReadReporting: false,
        canManageReporting: false,
      };
    case "cabinet_viewer":
    default:
      return {
        canRead: true,
        canWrite: false,
        canAdmin: false,
        canReadReporting: false,
        canManageReporting: false,
      };
  }
}

export function getCabinetCapabilityMatrix(): CabinetCapabilityMatrix & {
  cabinet_reporting_manage: keyof CabinetMembershipAccess;
} {
  return {
    cabinet_read: "canRead",
    cabinet_write: "canWrite",
    cabinet_admin: "canAdmin",
    cabinet_reporting_read: "canReadReporting",
    cabinet_reporting_manage: "canManageReporting",
  };
}

export function canCabinetRoleAccessAction(role: CabinetRole, action: CabinetAction): boolean {
  const access = getCabinetMembershipAccess(role);
  const capabilityKey = getCabinetCapabilityMatrix()[action];
  return access[capabilityKey];
}

export function canCompanyRoleAccessCabinetAction(role: string | null | undefined, action: CabinetAction): boolean {
  if (role !== "company_admin") {
    return false;
  }

  return action === "cabinet_admin" || action === "cabinet_reporting_read" || action === "cabinet_reporting_manage";
}

export function buildAuthorizationSubjectContext(input: {
  actor: Actor;
  companyContext: CompanyContext;
  cabinetContext?: CabinetContext | null;
}): AuthorizationSubjectContext {
  const { actor, companyContext, cabinetContext = null } = input;

  const companyMemberships = companyContext.membershipCompanyIds.map((companyId) => ({
    companyId,
    isDefault: companyContext.membershipDefaultCompanyId === companyId,
    role: companyContext.membershipRoleByCompanyId[companyId],
  }));

  const cabinetMemberships = cabinetContext
    ? cabinetContext.membershipCabinetIds.map((cabinetId) => ({
        cabinetId,
        companyId: cabinetContext.companyId ?? companyContext.companyId ?? "",
        role: cabinetContext.roleByCabinetId[cabinetId] ?? "cabinet_viewer",
        isDefault: cabinetContext.membershipDefaultCabinetId === cabinetId,
      }))
    : [];

  return {
    actor,
    company: {
      companyId: companyContext.companyId,
      source: companyContext.source,
      denyReason: companyContext.denyReason,
      denyMessage: companyContext.denyMessage,
    },
    cabinet: {
      cabinetId: cabinetContext?.cabinetId ?? null,
      companyId: cabinetContext?.companyId ?? companyContext.companyId,
      source: cabinetContext?.source ?? "none",
      denyReason: cabinetContext?.denyReason,
      denyMessage: cabinetContext?.denyMessage,
    },
    companyMemberships,
    cabinetMemberships: cabinetMemberships.filter((membership) => membership.companyId.length > 0),
  };
}

export type CompanyMembershipProviderResult = {
  memberships: CompanyMembershipRef[];
  defaultCompanyId: string | null;
};

export interface CompanyMembershipProvider {
  getMemberships(actor: Actor): Promise<CompanyMembershipProviderResult>;
}

export type CompanyContext = {
  companyId: string | null;
  source: "none" | "request" | "workspace_default" | "membership_default";
  requestCompanyId: string | null;
  workspaceCompanyId: string | null;
  membershipCompanyIds: string[];
  membershipDefaultCompanyId: string | null;
  membershipRoleByCompanyId: Record<string, string>;
  denyReason?: "company_mismatch";
  denyMessage?: string;
};

export type CabinetMembershipProviderResult = {
  memberships: CabinetMembershipRef[];
  defaultCabinetId: string | null;
};

export interface CabinetMembershipProvider {
  getMemberships(actor: Actor, companyContext: CompanyContext): Promise<CabinetMembershipProviderResult>;
}

export type CabinetContext = {
  cabinetId: string | null;
  companyId: string | null;
  source: "none" | "request" | "membership_default" | "resource_mapping";
  requestCabinetId: string | null;
  membershipCabinetIds: string[];
  membershipDefaultCabinetId: string | null;
  roleByCabinetId: Record<string, CabinetRole>;
  resourceCabinetId: string | null;
  denyReason?: "cabinet_mismatch";
  denyMessage?: string;
};

export type PageResourceContext = {
  resourceType: "page";
  virtualPath: string;
  pageId: string | null;
  ownerUsername: string | null;
  visibility: "public" | "private" | null;
  sourcePath?: string;
  requiresPageContext?: boolean;
  requiresCabinetContext?: boolean;
  companyId?: string | null;
  cabinetId?: string | null;
};

export type AuthorizationDecision = {
  allowed: boolean;
  reason?:
    | "unauthenticated"
    | "forbidden"
    | "private_page"
    | "misconfigured_private_page"
    | "missing_page_context"
    | "missing_cabinet_context"
    | "company_mismatch"
    | "cabinet_mismatch"
    | "read_only_role"
    | "unknown";
  message?: string;
  status?: 401 | 403 | 404;
};

export async function resolveActorFromRequest(req: NextRequest): Promise<Actor> {
  const user = getRequestUser(req);

  if (!user) {
    return { kind: "anonymous" };
  }

  return {
    kind: "user",
    userId: user.userId,
    username: user.username,
    role: user.role,
  };
}

export function setCompanyMembershipProvider(provider: CompanyMembershipProvider): void {
  activeCompanyMembershipProvider = provider;
}

export function resetCompanyMembershipProvider(): void {
  activeCompanyMembershipProvider = defaultCompanyMembershipProvider;
}

export function setCabinetMembershipProvider(provider: CabinetMembershipProvider): void {
  activeCabinetMembershipProvider = provider;
}

export function resetCabinetMembershipProvider(): void {
  activeCabinetMembershipProvider = defaultCabinetMembershipProvider;
}

export function setCabinetResourceMappingProvider(provider: CabinetResourceMappingProvider): void {
  activeCabinetResourceMappingProvider = provider;
}

export function resetCabinetResourceMappingProvider(): void {
  activeCabinetResourceMappingProvider = defaultCabinetResourceMappingProvider;
}

async function readWorkspaceDefaultCompanyId(): Promise<string | null> {
  try {
    const raw = await fs.readFile(COMPANY_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as {
      company?: { id?: unknown };
      companyId?: unknown;
    };

    const candidates = [parsed.company?.id, parsed.companyId];
    for (const candidate of candidates) {
      if (typeof candidate === "string") {
        const trimmed = candidate.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeMemberships(result: CompanyMembershipProviderResult): CompanyMembershipProviderResult {
  const memberships = result.memberships
    .map((membership) => ({
      companyId: membership.companyId.trim(),
      isDefault: membership.isDefault === true,
      role: typeof membership.role === "string" ? membership.role.trim() : undefined,
    }))
    .filter((membership) => membership.companyId.length > 0);

  const membershipCompanyIds = new Set(memberships.map((membership) => membership.companyId));
  let defaultCompanyId =
    typeof result.defaultCompanyId === "string" && result.defaultCompanyId.trim()
      ? result.defaultCompanyId.trim()
      : null;

  if (!defaultCompanyId) {
    defaultCompanyId = memberships.find((membership) => membership.isDefault)?.companyId ?? null;
  }

  if (defaultCompanyId && !membershipCompanyIds.has(defaultCompanyId)) {
    defaultCompanyId = null;
  }

  return {
    memberships,
    defaultCompanyId,
  };
}

function buildCompanyMismatchContext(input: {
  requestCompanyId: string;
  workspaceCompanyId: string | null;
  membershipCompanyIds: string[];
  membershipDefaultCompanyId: string | null;
  membershipRoleByCompanyId: Record<string, string>;
}): CompanyContext {
  return {
    companyId: null,
    source: "none",
    requestCompanyId: input.requestCompanyId,
    workspaceCompanyId: input.workspaceCompanyId,
    membershipCompanyIds: input.membershipCompanyIds,
    membershipDefaultCompanyId: input.membershipDefaultCompanyId,
    membershipRoleByCompanyId: input.membershipRoleByCompanyId,
    denyReason: "company_mismatch",
    denyMessage: `Access denied — requested company ${input.requestCompanyId} is not part of the actor's memberships`,
  };
}

export async function resolveCompanyContextForRequest(
  req: NextRequest,
  actor: Actor,
): Promise<CompanyContext> {
  const requestCompanyId =
    req.headers.get("x-company-id")?.trim() || req.nextUrl.searchParams.get("companyId")?.trim() || null;

  const [{ memberships, defaultCompanyId }, workspaceCompanyId] = await Promise.all([
    activeCompanyMembershipProvider.getMemberships(actor).then(normalizeMemberships),
    readWorkspaceDefaultCompanyId(),
  ]);

  const membershipCompanyIds = memberships.map((membership) => membership.companyId);
  const membershipCompanyIdSet = new Set(membershipCompanyIds);
  const membershipRoleByCompanyId = memberships.reduce<Record<string, string>>((acc, membership) => {
    if (membership.role) {
      acc[membership.companyId] = membership.role;
    }
    return acc;
  }, {});

  if (requestCompanyId) {
    if (actor.kind === "anonymous") {
      return {
        companyId: requestCompanyId,
        source: "request",
        requestCompanyId,
        workspaceCompanyId,
        membershipCompanyIds: [],
        membershipDefaultCompanyId: null,
        membershipRoleByCompanyId: {},
      };
    }

    if (!membershipCompanyIdSet.has(requestCompanyId)) {
      return buildCompanyMismatchContext({
        requestCompanyId,
        workspaceCompanyId,
        membershipCompanyIds,
        membershipDefaultCompanyId: defaultCompanyId,
        membershipRoleByCompanyId,
      });
    }

    return {
      companyId: requestCompanyId,
      source: "request",
      requestCompanyId,
      workspaceCompanyId,
      membershipCompanyIds,
      membershipDefaultCompanyId: defaultCompanyId,
      membershipRoleByCompanyId,
    };
  }

  if (workspaceCompanyId) {
    return {
      companyId: workspaceCompanyId,
      source: "workspace_default",
      requestCompanyId: null,
      workspaceCompanyId,
      membershipCompanyIds,
      membershipDefaultCompanyId: defaultCompanyId,
      membershipRoleByCompanyId,
    };
  }

  if (defaultCompanyId) {
    return {
      companyId: defaultCompanyId,
      source: "membership_default",
      requestCompanyId: null,
      workspaceCompanyId,
      membershipCompanyIds,
      membershipDefaultCompanyId: defaultCompanyId,
      membershipRoleByCompanyId,
    };
  }

  return {
    companyId: null,
    source: "none",
    requestCompanyId: null,
    workspaceCompanyId,
    membershipCompanyIds,
    membershipDefaultCompanyId: defaultCompanyId,
    membershipRoleByCompanyId,
  };
}

export type ResolvePageResourceContextInput = {
  virtualPath: string;
  actor: Actor;
  companyContext: CompanyContext;
};

function normalizeCabinetMemberships(result: CabinetMembershipProviderResult): CabinetMembershipProviderResult {
  const memberships = result.memberships
    .map((membership) => ({
      cabinetId: membership.cabinetId.trim(),
      companyId: membership.companyId.trim(),
      role: membership.role,
      isDefault: membership.isDefault === true,
    }))
    .filter((membership) => membership.cabinetId.length > 0 && membership.companyId.length > 0);

  const membershipCabinetIds = new Set(memberships.map((membership) => membership.cabinetId));
  let defaultCabinetId =
    typeof result.defaultCabinetId === "string" && result.defaultCabinetId.trim()
      ? result.defaultCabinetId.trim()
      : null;

  if (!defaultCabinetId) {
    defaultCabinetId = memberships.find((membership) => membership.isDefault)?.cabinetId ?? null;
  }

  if (defaultCabinetId && !membershipCabinetIds.has(defaultCabinetId)) {
    defaultCabinetId = null;
  }

  return {
    memberships,
    defaultCabinetId,
  };
}

function buildCabinetMismatchContext(input: {
  requestCabinetId: string;
  companyId: string | null;
  membershipCabinetIds: string[];
  membershipDefaultCabinetId: string | null;
  roleByCabinetId: Record<string, CabinetRole>;
  resourceCabinetId?: string | null;
}): CabinetContext {
  return {
    cabinetId: null,
    companyId: input.companyId,
    source: "none",
    requestCabinetId: input.requestCabinetId,
    membershipCabinetIds: input.membershipCabinetIds,
    membershipDefaultCabinetId: input.membershipDefaultCabinetId,
    roleByCabinetId: input.roleByCabinetId,
    resourceCabinetId: input.resourceCabinetId ?? null,
    denyReason: "cabinet_mismatch",
    denyMessage: `Access denied — requested cabinet ${input.requestCabinetId} is not part of the actor's memberships`,
  };
}

export async function resolveCabinetContextForResource(input: {
  actor: Actor;
  companyContext: CompanyContext;
  resourceContext: Pick<PageResourceContext, "virtualPath" | "cabinetId" | "companyId" | "requiresCabinetContext">;
}): Promise<CabinetContext> {
  const { actor, companyContext, resourceContext } = input;
  const cabinetId = resourceContext.cabinetId ?? null;
  const companyId = resourceContext.companyId ?? companyContext.companyId ?? null;
  const { memberships, defaultCabinetId } = await activeCabinetMembershipProvider
    .getMemberships(actor, companyContext)
    .then(normalizeCabinetMemberships);

  const filteredMemberships = companyId
    ? memberships.filter((membership) => membership.companyId === companyId)
    : memberships;
  const membershipCabinetIds = filteredMemberships.map((membership) => membership.cabinetId);
  const membershipCabinetIdSet = new Set(membershipCabinetIds);
  const roleByCabinetId = filteredMemberships.reduce<Record<string, CabinetRole>>((acc, membership) => {
    acc[membership.cabinetId] = membership.role;
    return acc;
  }, {});
  const resolvedDefaultCabinetId =
    defaultCabinetId && membershipCabinetIdSet.has(defaultCabinetId) ? defaultCabinetId : null;

  if (!cabinetId) {
    return {
      cabinetId: null,
      companyId,
      source: "none",
      requestCabinetId: null,
      membershipCabinetIds,
      membershipDefaultCabinetId: resolvedDefaultCabinetId,
      roleByCabinetId,
      resourceCabinetId: null,
    };
  }

  return {
    cabinetId,
    companyId,
    source: "resource_mapping",
    requestCabinetId: null,
    membershipCabinetIds,
    membershipDefaultCabinetId: resolvedDefaultCabinetId,
    roleByCabinetId,
    resourceCabinetId: cabinetId,
  };
}

export async function resolveCabinetContextForRequest(input: {
  req: NextRequest;
  actor: Actor;
  companyContext: CompanyContext;
  resourceContext?: Pick<PageResourceContext, "cabinetId"> | null;
}): Promise<CabinetContext> {
  const { req, actor, companyContext, resourceContext } = input;
  const requestCabinetId =
    req.headers.get("x-cabinet-id")?.trim() || req.nextUrl.searchParams.get("cabinetId")?.trim() || null;
  const resourceCabinetId = resourceContext?.cabinetId ?? null;

  const { memberships, defaultCabinetId } = await activeCabinetMembershipProvider
    .getMemberships(actor, companyContext)
    .then(normalizeCabinetMemberships);

  const filteredMemberships = companyContext.companyId
    ? memberships.filter((membership) => membership.companyId === companyContext.companyId)
    : memberships;
  const membershipCabinetIds = filteredMemberships.map((membership) => membership.cabinetId);
  const membershipCabinetIdSet = new Set(membershipCabinetIds);
  const roleByCabinetId = filteredMemberships.reduce<Record<string, CabinetRole>>((acc, membership) => {
    acc[membership.cabinetId] = membership.role;
    return acc;
  }, {});
  const resolvedDefaultCabinetId =
    defaultCabinetId && membershipCabinetIdSet.has(defaultCabinetId) ? defaultCabinetId : null;

  if (requestCabinetId) {
    if (actor.kind === "anonymous") {
      return {
        cabinetId: requestCabinetId,
        companyId: companyContext.companyId,
        source: "request",
        requestCabinetId,
        membershipCabinetIds: [],
        membershipDefaultCabinetId: null,
        roleByCabinetId: {},
        resourceCabinetId,
      };
    }

    if (!membershipCabinetIdSet.has(requestCabinetId)) {
      return buildCabinetMismatchContext({
        requestCabinetId,
        companyId: companyContext.companyId,
        membershipCabinetIds,
        membershipDefaultCabinetId: resolvedDefaultCabinetId,
        roleByCabinetId,
        resourceCabinetId,
      });
    }

    return {
      cabinetId: requestCabinetId,
      companyId: companyContext.companyId,
      source: "request",
      requestCabinetId,
      membershipCabinetIds,
      membershipDefaultCabinetId: resolvedDefaultCabinetId,
      roleByCabinetId,
      resourceCabinetId,
    };
  }

  if (resourceCabinetId) {
    return {
      cabinetId: resourceCabinetId,
      companyId: companyContext.companyId,
      source: "resource_mapping",
      requestCabinetId: null,
      membershipCabinetIds,
      membershipDefaultCabinetId: resolvedDefaultCabinetId,
      roleByCabinetId,
      resourceCabinetId,
    };
  }

  if (resolvedDefaultCabinetId) {
    return {
      cabinetId: resolvedDefaultCabinetId,
      companyId: companyContext.companyId,
      source: "membership_default",
      requestCabinetId: null,
      membershipCabinetIds,
      membershipDefaultCabinetId: resolvedDefaultCabinetId,
      roleByCabinetId,
      resourceCabinetId,
    };
  }

  return {
    cabinetId: null,
    companyId: companyContext.companyId,
    source: "none",
    requestCabinetId: null,
    membershipCabinetIds,
    membershipDefaultCabinetId: resolvedDefaultCabinetId,
    roleByCabinetId,
    resourceCabinetId,
  };
}

export function resolveCabinetActionFromAuthorizationAction(action: AuthorizationAction): CabinetAction | null {
  switch (action) {
    case "read_raw":
      return "cabinet_read";
    case "write_raw":
    case "delete_raw":
      return "cabinet_write";
    case "admin_raw":
      return "cabinet_admin";
    case "read_reporting":
      return "cabinet_reporting_read";
    case "manage_reporting":
      return "cabinet_reporting_manage";
    default:
      return "cabinet_read";
  }
}

export function evaluateCabinetAccess(input: {
  actor: Actor;
  companyContext: CompanyContext;
  cabinetContext?: CabinetContext | null;
  action: CabinetAction;
}): AuthorizationDecision | null {
  const { actor, companyContext, cabinetContext, action } = input;

  if (!cabinetContext || !cabinetContext.cabinetId) {
    return null;
  }

  if (cabinetContext.denyReason === "cabinet_mismatch") {
    return {
      allowed: false,
      reason: "cabinet_mismatch",
      message: cabinetContext.denyMessage ?? "Access denied — cabinet context mismatch",
      status: 403,
    };
  }

  if (actor.kind === "anonymous") {
    return null;
  }

  if (actor.role === "admin") {
    return { allowed: true };
  }

  const companyRole = companyContext.companyId
    ? companyContext.membershipRoleByCompanyId[companyContext.companyId] ?? null
    : null;
  if (canCompanyRoleAccessCabinetAction(companyRole, action)) {
    return { allowed: true };
  }

  const role = cabinetContext.roleByCabinetId[cabinetContext.cabinetId] ?? null;
  if (!role) {
    return {
      allowed: false,
      reason: "cabinet_mismatch",
      message: `Access denied — no cabinet membership for ${cabinetContext.cabinetId}`,
      status: 403,
    };
  }

  if (action === "cabinet_read") {
    return { allowed: true };
  }

  if (canCabinetRoleAccessAction(role, action)) {
    return { allowed: true };
  }

  if (action === "cabinet_reporting_read") {
    return {
      allowed: false,
      reason: "forbidden",
      message: "Cabinet admin access required for reporting reads",
      status: 403,
    };
  }

  if (action === "cabinet_reporting_manage") {
    return {
      allowed: false,
      reason: "forbidden",
      message: "Cabinet admin access required for reporting management",
      status: 403,
    };
  }

  if (action === "cabinet_write") {
    return {
      allowed: false,
      reason: "read_only_role",
      message: "Cabinet viewers have read-only access",
      status: 403,
    };
  }

  return {
    allowed: false,
    reason: "forbidden",
    message: "Cabinet admin access required",
    status: 403,
  };
}

export async function resolvePageResourceContext(
  input: ResolvePageResourceContextInput,
): Promise<PageResourceContext> {
  void input.actor;
  void input.companyContext;

  return resolvePageResourceContextFromPagePath(input.virtualPath, input.virtualPath);
}

async function resolvePageResourceContextFromPagePath(
  pageVirtualPath: string,
  sourcePath: string,
): Promise<OwnedPageResourceContext> {
  const cabinetMapping = await activeCabinetResourceMappingProvider.resolveCabinetForPage(pageVirtualPath);
  const ownership = buildResourceOwnershipChain({
    virtualPath: pageVirtualPath,
    mapping: cabinetMapping,
  });

  try {
    const meta = await readPageMeta(pageVirtualPath);

    return attachOwnershipToPageResourceContext(
      {
        resourceType: "page",
        virtualPath: pageVirtualPath,
        pageId: null,
        ownerUsername: meta.owner ?? null,
        visibility: meta.visibility === "private" ? "private" : "public",
        sourcePath,
        requiresPageContext: false,
        requiresCabinetContext: true,
      },
      ownership,
    );
  } catch {
    return attachOwnershipToPageResourceContext(
      {
        resourceType: "page",
        virtualPath: pageVirtualPath,
        pageId: null,
        ownerUsername: null,
        visibility: null,
        sourcePath,
        requiresPageContext: false,
        requiresCabinetContext: false,
      },
      ownership,
    );
  }
}

export async function resolvePageDerivedResourceContext(
  virtualPath: string,
): Promise<PageResourceContext> {
  const normalizedPath = virtualPath.replace(/^\/+|\/+$/g, "");
  const candidates = new Set<string>();

  if (normalizedPath) {
    candidates.add(normalizedPath);

    let current = normalizedPath;
    while (current) {
      current = dirname(current);
      if (!current || current === ".") break;
      candidates.add(current);
    }
  }

  candidates.add("");

  for (const candidate of candidates) {
    const context = await resolvePageResourceContextFromPagePath(candidate, virtualPath);
    if (context.visibility !== null || context.ownerUsername !== null) {
      return context;
    }
  }

  const ownership = buildResourceOwnershipChain({
    virtualPath: normalizedPath,
  });

  return attachOwnershipToPageResourceContext(
    {
      resourceType: "page",
      virtualPath: normalizedPath,
      pageId: null,
      ownerUsername: null,
      visibility: null,
      sourcePath: virtualPath,
      requiresPageContext: true,
      requiresCabinetContext: false,
    },
    ownership,
  );
}

export async function authorizeUserAction(input: {
  actor: Actor;
  companyContext: CompanyContext;
  resourceContext: PageResourceContext;
  action: AuthorizationAction;
  cabinetContext?: CabinetContext | null;
  anonymousAccessPolicy?: AnonymousAccessPolicy;
}): Promise<AuthorizationDecision> {
  const {
    actor,
    companyContext,
    resourceContext,
    action,
    cabinetContext = null,
    anonymousAccessPolicy = DEFAULT_ANONYMOUS_ACCESS_POLICY,
  } = input;

  // Unified authorization center for page and page-derived resources.
  // This supersedes the removed legacy access-control helper by owning:
  // - anonymous/authenticated gating
  // - admin-only actions
  // - viewer read-only restrictions
  // - private/misconfigured page rules
  // - page-derived resource context enforcement

  if (resourceContext.resourceType !== "page") {
    return {
      allowed: false,
      reason: "unknown",
      message: "Unsupported resource type",
      status: 403,
    };
  }

  if (
    action !== "read_raw" &&
    action !== "write_raw" &&
    action !== "delete_raw" &&
    action !== "admin_raw" &&
    action !== "read_reporting" &&
    action !== "manage_reporting"
  ) {
    return {
      allowed: false,
      reason: "unknown",
      message: "Unsupported action in v1",
      status: 403,
    };
  }

  if (cabinetContext?.denyReason === "cabinet_mismatch") {
    return {
      allowed: false,
      reason: "cabinet_mismatch",
      message: cabinetContext.denyMessage ?? "Access denied — cabinet context mismatch",
      status: 403,
    };
  }

  if (actor.kind === "anonymous") {
    if (action === "read_raw" && anonymousAccessPolicy.allowAnonymousRead) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "unauthenticated",
      message: "Authentication required",
      status: 401,
    };
  }

  if (actor.role === "admin") {
    return { allowed: true };
  }

  if (action === "admin_raw") {
    const adminCabinetDecision = evaluateCabinetAccess({
      actor,
      companyContext,
      cabinetContext,
      action: "cabinet_admin",
    });
    if (adminCabinetDecision?.allowed) {
      return adminCabinetDecision;
    }

    return {
      allowed: false,
      reason: "forbidden",
      message: "Admin access required",
      status: 403,
    };
  }

  if (action === "manage_reporting") {
    const reportingManageDecision = evaluateCabinetAccess({
      actor,
      companyContext,
      cabinetContext,
      action: "cabinet_reporting_manage",
    });
    if (reportingManageDecision?.allowed) {
      return reportingManageDecision;
    }

    const companyRole = companyContext.companyId
      ? companyContext.membershipRoleByCompanyId[companyContext.companyId] ?? null
      : null;
    if (canCompanyRoleAccessCabinetAction(companyRole, "cabinet_reporting_manage")) {
      return { allowed: true };
    }

    return reportingManageDecision ?? {
      allowed: false,
      reason: "forbidden",
      message: "Reporting management access required",
      status: 403,
    };
  }

  if (action === "read_reporting") {
    const reportingCabinetDecision = evaluateCabinetAccess({
      actor,
      companyContext,
      cabinetContext,
      action: "cabinet_reporting_read",
    });
    if (reportingCabinetDecision) {
      return reportingCabinetDecision;
    }

    return {
      allowed: false,
      reason: "missing_cabinet_context",
      message: "Access denied — reporting requires a parent cabinet context",
      status: 403,
    };
  }

  if (actor.role === "viewer" && action !== "read_raw") {
    return {
      allowed: false,
      reason: "read_only_role",
      message: "Viewers have read-only access",
      status: 403,
    };
  }

  if (resourceContext.requiresPageContext && resourceContext.visibility === null) {
    return {
      allowed: false,
      reason: "missing_page_context",
      message: "Access denied — resource is not associated with a page",
      status: 403,
    };
  }

  if (resourceContext.requiresCabinetContext && !cabinetContext?.cabinetId) {
    return {
      allowed: false,
      reason: "missing_cabinet_context",
      message: "This resource requires cabinet context",
      status: 404,
    };
  }

  const ownership = isOwnedPageResourceContext(resourceContext)
    ? resourceContext.ownership
    : resolveOwnershipChainFromPageResource(resourceContext);
  const ownershipValidation = validateResourceOwnershipAlignment({
    ownership,
    companyContext,
    cabinetContext,
  });

  if (ownershipValidation.mismatchReason === "company_mismatch") {
    return {
      allowed: false,
      reason: "company_mismatch",
      message: ownershipValidation.mismatchMessage,
      status: 403,
    };
  }

  if (ownershipValidation.mismatchReason === "cabinet_mismatch") {
    return {
      allowed: false,
      reason: "cabinet_mismatch",
      message: ownershipValidation.mismatchMessage,
      status: 403,
    };
  }

  if (companyContext.denyReason === "company_mismatch") {
    return {
      allowed: false,
      reason: "company_mismatch",
      message: companyContext.denyMessage ?? "Access denied — company context mismatch",
      status: 403,
    };
  }

  if (cabinetContext?.denyReason === "cabinet_mismatch") {
    return {
      allowed: false,
      reason: "cabinet_mismatch",
      message: cabinetContext.denyMessage ?? "Access denied — cabinet context mismatch",
      status: 403,
    };
  }

  const cabinetAction = resolveCabinetActionFromAuthorizationAction(action);
  if (cabinetAction) {
    const cabinetDecision = evaluateCabinetAccess({
      actor,
      companyContext,
      cabinetContext,
      action: cabinetAction,
    });
    if (cabinetDecision) {
      return cabinetDecision;
    }
  }

  if (resourceContext.visibility === "private" && !resourceContext.ownerUsername) {
    return {
      allowed: false,
      reason: "misconfigured_private_page",
      message: "Access denied — private page is missing an owner",
      status: 403,
    };
  }

  if (
    resourceContext.visibility === "private" &&
    resourceContext.ownerUsername &&
    actor.username !== resourceContext.ownerUsername
  ) {
    return {
      allowed: false,
      reason: "private_page",
      message: "Access denied — private page",
      status: 403,
    };
  }

  if (companyContext.companyId) {
    void companyContext.companyId;
  }

  if (cabinetContext?.cabinetId || resourceContext.cabinetId) {
    void cabinetContext?.cabinetId;
    void resourceContext.cabinetId;
  }

  return { allowed: true };
}

export function authorizeAdminActor(actor: Actor): AdminAuthorizationResult {
  if (actor.kind === "anonymous") {
    return {
      allowed: false,
      reason: "Authentication required",
      status: 401,
    };
  }

  if (actor.role === "admin") {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Admin access required",
    status: 403,
  };
}

export function toHttpErrorResponse(decision: AuthorizationDecision): NextResponse {
  const status = decision.status ?? 403;
  const error = decision.message ?? decision.reason ?? "Forbidden";

  return NextResponse.json({ error }, { status });
}
