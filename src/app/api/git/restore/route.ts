import { NextRequest, NextResponse } from "next/server";
import { restoreFileFromCommit, getStatus } from "@/lib/git/git-service";
import {
  authorizeAdminActor,
  resolveActorFromRequest,
  toHttpErrorResponse,
} from "@/lib/auth/page-authorization";
import path from "path";
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

    const { hash, pagePath } = await req.json();
    if (!hash || !pagePath) {
      return NextResponse.json(
        { error: "hash and pagePath are required" },
        { status: 400 }
      );
    }

    // Reject restore if worktree has uncommitted changes
    const status = await getStatus();
    if (status.uncommitted > 0) {
      return NextResponse.json(
        { error: "Cannot restore: repository has uncommitted changes. Please save or discard pending edits first." },
        { status: 409 }
      );
    }

    // Try both directory index.md and standalone .md
    const candidates = [
      path.join(pagePath, "index.md"),
      `${pagePath}.md`,
    ];

    let restored = false;
    for (const candidate of candidates) {
      restored = await restoreFileFromCommit(hash, candidate);
      if (restored) break;
    }

    if (!restored) {
      return NextResponse.json(
        { error: "Failed to restore — file may not exist at that commit" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
