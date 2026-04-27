import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { dirname, join } from "path";
import yaml from "js-yaml";
import { CABINET_MANIFEST_FILE } from "@/lib/cabinets/files";
import { readPageMeta } from "@/lib/storage/page-io";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { getRequestUser } from "./request-user";
import { resolveConfiguredCompanyId } from "./company-id";
import {
  buildResolvedCompanySelection,
  normalizeCompanyMemberships,
} from "./page-authorization/company-context";
import {
  buildCabinetContextForRequest,
  buildCabinetContextForResource,
  normalizeCabinetMemberships,
} from "./page-authorization/cabinet-context";
import {
  evaluateContextMismatchDecision,
  evaluatePageResourceRequirements,
  evaluatePrivatePageDecision,
  evaluateReportingAuthorizationDecision,
  evaluateResourceOwnershipDecision,
  evaluateStandardCabinetDecision,
} from "./page-authorization/decision-helpers";
import {
  fileCabinetMembershipProvider,
  fileCabinetResourceMappingProvider,
  fileCompanyMembershipProvider,
} from "./membership-store";

export { resolveActiveCompanySelection } from "./page-authorization/company-context";

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

export type CabinetMappingSource = "provider" | "none";

export type CabinetMappingResolution = {
  virtualPath: string;
  mapping: CabinetResourceMapping | null;
  source: CabinetMappingSource;
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

let activeCompanyMembershipProvider: CompanyMembershipProvider = fileCompanyMembershipProvider;
let activeCabinetMembershipProvider: CabinetMembershipProvider = fileCabinetMembershipProvider;
let activeCabinetResourceMappingProvider: CabinetResourceMappingProvider = fileCabinetResourceMappingProvider;

export type Actor =
  | { kind: "anonymous" }
  | {
      kind: "user";
      userId: string;
      username: string;
      role: string;
      systemRole?: string;
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
  mappingResolution?: CabinetMappingResolution | null;
}): ResourceOwnershipChain {
  const resolvedMapping = input.mappingResolution?.mapping ?? input.mapping ?? null;
  return {
    resourceType: "page",
    virtualPath: input.virtualPath,
    companyId: resolvedMapping?.companyId ?? null,
    cabinetId: resolvedMapping?.cabinetId ?? null,
    source: resolvedMapping ? "resource_mapping" : "none",
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
  status?: 400 | 401 | 403 | 404;
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
    systemRole: user.systemRole,
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

export async function resolveCabinetMappingForPath(virtualPath: string): Promise<CabinetMappingResolution> {
  const normalizedPath = virtualPath.replace(/^\/+|\/+$/g, "");
  const mapping = await activeCabinetResourceMappingProvider.resolveCabinetForPage(normalizedPath);
  return {
    virtualPath: normalizedPath,
    mapping,
    source: mapping ? "provider" : "none",
  };
}

export async function resolveOwnershipChainFromVirtualPath(
  virtualPath: string,
): Promise<ResourceOwnershipChain> {
  const normalizedPath = virtualPath.replace(/^\/+|\/+$/g, "");
  const mappingResolution = await resolveCabinetMappingForPath(normalizedPath);
  return buildResourceOwnershipChain({
    virtualPath: normalizedPath,
    mappingResolution,
  });
}

export function resetCabinetResourceMappingProvider(): void {
  activeCabinetResourceMappingProvider = defaultCabinetResourceMappingProvider;
}

export function resetMembershipProvidersToFileDefaults(): void {
  activeCompanyMembershipProvider = fileCompanyMembershipProvider;
  activeCabinetMembershipProvider = fileCabinetMembershipProvider;
  activeCabinetResourceMappingProvider = fileCabinetResourceMappingProvider;
}

async function readWorkspaceDefaultCompanyId(): Promise<string | null> {
  try {
    const raw = await fs.readFile(COMPANY_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as {
      company?: { id?: unknown; name?: unknown };
      companyId?: unknown;
    };
    return resolveConfiguredCompanyId(parsed);
  } catch {
    // Fall through to legacy root cabinet manifest.
  }

  try {
    const raw = await fs.readFile(join(DATA_DIR, CABINET_MANIFEST_FILE), "utf-8");
    const parsed = yaml.load(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const manifest = parsed as { id?: unknown; name?: unknown };
      return (
        resolveConfiguredCompanyId({ company: { name: manifest.name } }) ||
        (typeof manifest.id === "string" && manifest.id.trim() ? manifest.id.trim() : null)
      );
    }
  } catch {
    // No legacy manifest available.
  }

  return null;
}


export async function resolveCompanyContextForRequest(
  req: NextRequest,
  actor: Actor,
): Promise<CompanyContext> {
  const requestCompanyId =
    req.headers.get("x-company-id")?.trim() || req.nextUrl.searchParams.get("companyId")?.trim() || null;

  const [{ memberships, defaultCompanyId }, workspaceCompanyId] = await Promise.all([
    activeCompanyMembershipProvider.getMemberships(actor).then(normalizeCompanyMemberships),
    readWorkspaceDefaultCompanyId(),
  ]);

  return buildResolvedCompanySelection({
    actor,
    memberships,
    defaultCompanyId,
    requestCompanyId,
    workspaceCompanyId,
  });
}

export type ResolvePageResourceContextInput = {
  virtualPath: string;
  actor: Actor;
  companyContext: CompanyContext;
};

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

  return buildCabinetContextForResource({
    companyId,
    resourceCabinetId: cabinetId,
    memberships,
    defaultCabinetId,
  });
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

  return buildCabinetContextForRequest({
    actor,
    companyContext,
    requestCabinetId,
    resourceCabinetId,
    memberships,
    defaultCabinetId,
  });
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

  if (actor.role === "admin" || actor.systemRole === "platform_admin") {
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
  const mappingResolution = await resolveCabinetMappingForPath(pageVirtualPath);
  const ownership = buildResourceOwnershipChain({
    virtualPath: pageVirtualPath,
    mappingResolution,
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
    if (candidate === normalizedPath && (context.companyId !== null || context.cabinetId !== null)) {
      return context;
    }
  }

  const mappingResolution = await resolveCabinetMappingForPath(normalizedPath);
  const ownership = buildResourceOwnershipChain({
    virtualPath: normalizedPath,
    mappingResolution,
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

  if (actor.role === "admin" || actor.systemRole === "platform_admin") {
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

  if (action === "manage_reporting" || action === "read_reporting") {
    return evaluateReportingAuthorizationDecision({
      action,
      actor,
      companyContext,
      resourceContext,
      cabinetContext,
    });
  }

  if (actor.role === "viewer" && action !== "read_raw") {
    return {
      allowed: false,
      reason: "read_only_role",
      message: "Viewers have read-only access",
      status: 403,
    };
  }

  const pageRequirementDecision = evaluatePageResourceRequirements(resourceContext, cabinetContext);
  if (pageRequirementDecision) {
    return pageRequirementDecision;
  }

  const ownershipDecision = evaluateResourceOwnershipDecision({
    resourceContext,
    companyContext,
    cabinetContext,
  });
  if (ownershipDecision) {
    return ownershipDecision;
  }

  const contextMismatchDecision = evaluateContextMismatchDecision({
    companyContext,
    cabinetContext,
  });
  if (contextMismatchDecision) {
    return contextMismatchDecision;
  }

  const cabinetDecision = evaluateStandardCabinetDecision({
    actor,
    companyContext,
    cabinetContext,
    action,
  });
  if (cabinetDecision) {
    return cabinetDecision;
  }

  const privatePageDecision = evaluatePrivatePageDecision({
    actor,
    resourceContext,
  });
  if (privatePageDecision) {
    return privatePageDecision;
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

  if (actor.role === "admin" || actor.systemRole === "platform_admin") {
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
