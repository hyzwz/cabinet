import { NextRequest, NextResponse } from "next/server";
import {
  getReportingReadService,
  getReportingSnapshotRefreshService,
  resolveActorFromRequest,
  resolveCabinetContextForRequest,
  resolveCompanyContextForRequest,
  toHttpErrorResponse,
} from "@/lib/auth";
import { validateReportingScopeAlignment } from "@/lib/auth/reporting";

interface RouteParams {
  params: Promise<{
    cabinetId: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { cabinetId } = await params;

    const actor = await resolveActorFromRequest(req);
    const companyContext = await resolveCompanyContextForRequest(req, actor);
    const cabinetContext = await resolveCabinetContextForRequest({
      req,
      actor,
      companyContext,
      resourceContext: {
        cabinetId,
      },
    });

    const companyId = companyContext.companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: "Company context is required", code: "missing_company_context" },
        { status: 403 },
      );
    }

    const parentCabinetPath = req.nextUrl.searchParams.get("cabinetPath")?.trim() || null;

    const scopeDecision = await validateReportingScopeAlignment({
      companyId,
      parentCabinetId: cabinetId,
      parentCabinetPath,
      companyContext,
      cabinetContext,
    });
    if (scopeDecision) {
      return toHttpErrorResponse(scopeDecision);
    }

    const refreshService = getReportingSnapshotRefreshService();
    await refreshService.refreshSnapshotsForParent({
      companyId,
      parentCabinetId: cabinetId,
      parentCabinetPath,
    });

    const readService = getReportingReadService();
    const { snapshots, scope } = await readService.getReportingForParent({
      companyId,
      parentCabinetId: cabinetId,
      parentCabinetPath,
      actor,
      companyContext,
      cabinetContext,
    });

    return NextResponse.json({ snapshots, scope });
  } catch (error) {
    const authDecision =
      error instanceof Error && "decision" in error
        ? (error as Error & { decision?: Parameters<typeof toHttpErrorResponse>[0] }).decision
        : undefined;

    if (authDecision) {
      return toHttpErrorResponse(authDecision);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("company") || message.includes("cabinet") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
