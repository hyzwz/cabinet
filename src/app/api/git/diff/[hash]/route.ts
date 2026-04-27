import { NextRequest, NextResponse } from "next/server";
import { getDiff } from "@/lib/git/git-service";
import {
  authorizeAdminActor,
  resolveActorFromRequest,
  toHttpErrorResponse,
} from "@/lib/auth/page-authorization";

type RouteParams = { params: Promise<{ hash: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const actor = await resolveActorFromRequest(req);
    const access = authorizeAdminActor(actor);
    if (!access.allowed) {
      return toHttpErrorResponse({
        allowed: false,
        reason: "forbidden",
        message: access.reason,
        status: access.status,
      });
    }

    const { hash } = await params;
    const diff = await getDiff(hash);
    return NextResponse.json({ diff });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
