import { NextRequest, NextResponse } from "next/server";
import { manualCommit, getStatus } from "@/lib/git/git-service";
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

    const body = await req.json();
    const message = body.message || "Manual commit from KB";
    const commitUser =
      actor.kind === "user"
        ? { username: actor.username, displayName: actor.username }
        : undefined;
    const committed = await manualCommit(message, commitUser);
    return NextResponse.json({ ok: true, committed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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

    const status = await getStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
