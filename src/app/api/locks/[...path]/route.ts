import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { checkPageAccess, loadPageMeta } from "@/lib/auth/access-control";
import {
  getLock,
  acquireLock,
  releaseLock,
} from "@/lib/collaboration/lock-service";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");

    const user = getRequestUser(req);
    const meta = await loadPageMeta(virtualPath);
    const access = checkPageAccess(user, virtualPath, "read", meta);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 403 });
    }

    const lock = getLock(virtualPath);
    return NextResponse.json({ locked: !!lock, lock });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");
    const user = getRequestUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const meta = await loadPageMeta(virtualPath);
    const access = checkPageAccess(user, virtualPath, "write", meta);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 403 });
    }

    const result = acquireLock(virtualPath, user.userId, user.username);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Document is locked",
          lockedBy: result.lock.username,
          acquiredAt: result.lock.acquired_at,
        },
        { status: 423 }
      );
    }

    return NextResponse.json({ ok: true, lock: result.lock });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");
    const user = getRequestUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const released = releaseLock(
      virtualPath,
      user.userId,
      user.role === "admin"
    );
    if (!released) {
      return NextResponse.json(
        { error: "Cannot release lock owned by another user" },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
