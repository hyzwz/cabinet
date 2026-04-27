import { NextRequest, NextResponse } from "next/server";
import {
  authorizeAdminActor,
  authorizeUserAction,
  buildResourceOwnershipChain,
  attachOwnershipToPageResourceContext,
  resolveActorFromRequest,
  resolveCabinetMappingForPath,
  resolveCabinetContextForResource,
  resolveCompanyContextForRequest,
  resolvePageResourceContext,
  toHttpErrorResponse,
  type AuthorizationAction,
  type AuthorizationDecision,
} from "@/lib/auth/page-authorization";
import { normalizeCabinetPath, ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { requirePlatformAdmin } from "@/lib/auth/admin-guards";

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const platformAccess = await requirePlatformAdmin(req);
  if (platformAccess.ok) return null;

  const actor = await resolveActorFromRequest(req);
  const access = authorizeAdminActor(actor);
  if (access.allowed) return null;

  return toHttpErrorResponse({
    allowed: false,
    reason: access.status === 401 ? "unauthenticated" : "forbidden",
    message: access.reason,
    status: access.status,
  });
}

export async function authorizePageActionForRequest(
  req: NextRequest,
  virtualPath: string,
  action: AuthorizationAction,
): Promise<AuthorizationDecision> {
  const actor = await resolveActorFromRequest(req);
  const companyContext = await resolveCompanyContextForRequest(req, actor);
  const resourceContext = await resolvePageResourceContext({
    virtualPath,
    actor,
    companyContext,
  });
  const cabinetContext = await resolveCabinetContextForResource({
    actor,
    companyContext,
    resourceContext,
  });

  return authorizeUserAction({
    actor,
    companyContext,
    resourceContext,
    cabinetContext,
    action,
  });
}

export async function requirePageAction(
  req: NextRequest,
  virtualPath: string,
  action: AuthorizationAction,
): Promise<NextResponse | null> {
  const decision = await authorizePageActionForRequest(req, virtualPath, action);
  return decision.allowed ? null : toHttpErrorResponse(decision);
}

export async function canReadPageForRequest(
  req: NextRequest,
  virtualPath: string,
): Promise<boolean> {
  const decision = await authorizePageActionForRequest(req, virtualPath, "read_raw");
  return decision.allowed;
}

export async function authorizeCabinetReadForRequest(
  req: NextRequest,
  cabinetPath?: string | null,
): Promise<AuthorizationDecision> {
  const normalizedCabinetPath = normalizeCabinetPath(cabinetPath, true) || ROOT_CABINET_PATH;
  const actor = await resolveActorFromRequest(req);
  const companyContext = await resolveCompanyContextForRequest(req, actor);
  const mappingResolution = await resolveCabinetMappingForPath(normalizedCabinetPath);
  const ownership = buildResourceOwnershipChain({
    virtualPath: normalizedCabinetPath,
    mappingResolution,
  });
  const resourceContext = attachOwnershipToPageResourceContext(
    {
      resourceType: "page",
      virtualPath: normalizedCabinetPath,
      pageId: null,
      ownerUsername: null,
      visibility: null,
      requiresPageContext: false,
      requiresCabinetContext: true,
    },
    ownership,
  );
  const cabinetContext = await resolveCabinetContextForResource({
    actor,
    companyContext,
    resourceContext,
  });

  return authorizeUserAction({
    actor,
    companyContext,
    resourceContext,
    cabinetContext,
    action: "read_raw",
    anonymousAccessPolicy: { allowAnonymousRead: false },
  });
}

export async function requireCabinetRead(
  req: NextRequest,
  cabinetPath?: string | null,
): Promise<NextResponse | null> {
  const decision = await authorizeCabinetReadForRequest(req, cabinetPath);
  return decision.allowed ? null : toHttpErrorResponse(decision);
}

export async function canReadCabinetForRequest(
  req: NextRequest,
  cabinetPath?: string | null,
): Promise<boolean> {
  const decision = await authorizeCabinetReadForRequest(req, cabinetPath);
  return decision.allowed;
}
