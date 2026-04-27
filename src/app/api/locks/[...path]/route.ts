import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/request-user";
import {
  authorizeUserAction,
  resolveActorFromRequest,
  resolveCabinetContextForResource,
  resolveCompanyContextForRequest,
  resolvePageResourceContext,
  toHttpErrorResponse,
} from "@/lib/auth/page-authorization";
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
    const decision = await authorizeUserAction({
      actor,
      companyContext,
      resourceContext,
      cabinetContext,
      action: "read_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
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
    const decision = await authorizeUserAction({
      actor,
      companyContext,
      resourceContext,
      cabinetContext,
      action: "write_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
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
    const decision = await authorizeUserAction({
      actor,
      companyContext,
      resourceContext,
      cabinetContext,
      action: "write_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
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
