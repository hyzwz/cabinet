import { NextRequest, NextResponse } from "next/server";
import { gitPull } from "@/lib/git/git-service";
import {
  authorizeAdminActor,
  resolveActorFromRequest,
  toHttpErrorResponse,
} from "@/lib/auth/page-authorization";

export async function POST(req: NextRequest) {
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

    const result = await gitPull();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ pulled: false, summary: message }, { status: 500 });
  }
}
