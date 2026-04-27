import { NextRequest, NextResponse } from "next/server";
import { getPageHistory } from "@/lib/git/git-service";
import {
  authorizeUserAction,
  resolveActorFromRequest,
  resolveCompanyContextForRequest,
  resolvePageResourceContext,
  toHttpErrorResponse,
} from "@/lib/auth/page-authorization";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");

    const actor = await resolveActorFromRequest(req);
    const companyContext = await resolveCompanyContextForRequest(req, actor);
    const resourceContext = await resolvePageResourceContext({
      virtualPath,
      actor,
      companyContext,
    });
    const decision = await authorizeUserAction({
      actor,
      companyContext,
      resourceContext,
      action: "read_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    const history = await getPageHistory(virtualPath);
    return NextResponse.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
