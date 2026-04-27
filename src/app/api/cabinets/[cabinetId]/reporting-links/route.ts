import { NextRequest, NextResponse } from "next/server";
import { getReportingRelationService, type CabinetReportingLinkStatus } from "@/lib/auth";
import { ReportingRelationValidationError, validateReportingScopeAlignment } from "@/lib/auth/reporting";
import {
  resolveActorFromRequest,
  resolveCompanyContextForRequest,
  resolveCabinetContextForRequest,
  authorizeUserAction,
  toHttpErrorResponse,
} from "@/lib/auth/page-authorization";

interface RouteParams {
  params: Promise<{
    cabinetId: string;
  }>;
}

type CreateLinkBody = {
  childCabinetId?: string;
  childCabinetPath?: string;
  parentCabinetPath?: string;
};

type UpdateLinkBody = {
  linkId?: string;
  status?: CabinetReportingLinkStatus;
};

function toReportingResourceContext(input: { cabinetId: string; companyId: string | null }) {
  return {
    resourceType: "page" as const,
    virtualPath: `reporting/${input.cabinetId}`,
    pageId: null,
    ownerUsername: null,
    visibility: "public" as const,
    requiresPageContext: false,
    requiresCabinetContext: true,
    cabinetId: input.cabinetId,
    companyId: input.companyId,
  };
}

async function authorizeReportingManagement(req: NextRequest, cabinetId: string) {
  const requestedParentCabinetPath = req.nextUrl.searchParams.get("cabinetPath")?.trim() || null;
  const actor = await resolveActorFromRequest(req);
  const companyContext = await resolveCompanyContextForRequest(req, actor);
  const resourceContext = toReportingResourceContext({
    cabinetId,
    companyId: companyContext.companyId,
  });
  const cabinetContext = await resolveCabinetContextForRequest({
    req,
    actor,
    companyContext,
    resourceContext: {
      cabinetId,
    },
  });

  const scopeDecision = companyContext.companyId
    ? await validateReportingScopeAlignment({
        companyId: companyContext.companyId,
        parentCabinetId: cabinetId,
        parentCabinetPath: requestedParentCabinetPath,
        companyContext,
        cabinetContext,
      })
    : companyContext.denyReason === "company_mismatch"
      ? {
          allowed: false,
          reason: "company_mismatch" as const,
          message: companyContext.denyMessage ?? "Access denied — company context mismatch",
          status: 403 as const,
        }
      : cabinetContext?.denyReason === "cabinet_mismatch"
        ? {
            allowed: false,
            reason: "cabinet_mismatch" as const,
            message: cabinetContext.denyMessage ?? "Access denied — cabinet context mismatch",
            status: 403 as const,
          }
        : null;
  if (scopeDecision) {
    return { actor, companyContext, cabinetContext, decision: scopeDecision };
  }

  const decision = await authorizeUserAction({
    actor,
    companyContext,
    cabinetContext,
    resourceContext,
    action: "manage_reporting",
  });

  return { actor, companyContext, cabinetContext, decision };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { cabinetId } = await params;
    const { companyContext, decision } = await authorizeReportingManagement(req, cabinetId);

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    if (!companyContext.companyId) {
      return NextResponse.json(
        { error: "Company context is required", code: "missing_company_context" },
        { status: 403 },
      );
    }

    const service = getReportingRelationService();
    const links = await service.listLinksForCabinet({
      companyId: companyContext.companyId,
      cabinetId,
    });

    return NextResponse.json({
      links,
      scope: {
        companyId: companyContext.companyId,
        parentCabinetId: cabinetId,
        parentCabinetPath: req.nextUrl.searchParams.get("cabinetPath")?.trim() || null,
        activeChildCabinetIds: links
          .filter((link) => link.parentCabinetId === cabinetId && link.status === "active")
          .map((link) => link.childCabinetId),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { cabinetId } = await params;
    const { actor, companyContext, decision } = await authorizeReportingManagement(req, cabinetId);

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    if (!companyContext.companyId) {
      return NextResponse.json(
        { error: "Company context is required", code: "missing_company_context" },
        { status: 403 },
      );
    }

    const body = (await req.json()) as CreateLinkBody;
    if (!body.childCabinetId?.trim()) {
      return NextResponse.json({ error: "childCabinetId is required" }, { status: 400 });
    }

    const service = getReportingRelationService();
    const link = await service.createLink({
      companyId: companyContext.companyId,
      parentCabinetId: cabinetId,
      parentCabinetPath: body.parentCabinetPath?.trim() || null,
      childCabinetId: body.childCabinetId.trim(),
      childCabinetPath: body.childCabinetPath?.trim() || null,
      actor,
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    if (error instanceof ReportingRelationValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { cabinetId } = await params;
    const { actor, decision } = await authorizeReportingManagement(req, cabinetId);

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    const body = (await req.json()) as UpdateLinkBody;
    if (!body.linkId?.trim()) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    if (!body.status || !["active", "paused", "revoked"].includes(body.status)) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
    }

    const service = getReportingRelationService();
    const link = await service.updateLinkStatus({
      linkId: body.linkId.trim(),
      status: body.status,
      actor,
    });

    return NextResponse.json({ link });
  } catch (error) {
    if (error instanceof ReportingRelationValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
