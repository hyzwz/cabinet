import { NextRequest, NextResponse } from "next/server";
import {
  readPage,
  writePage,
  createPage,
  deletePage,
  canDeletePath,
  movePage,
  renamePage,
} from "@/lib/storage/page-io";
import { slugify } from "@/lib/storage/slugify";
import { autoCommit } from "@/lib/git/git-service";
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
  deleteLocksByPath,
  migrateLockPaths,
} from "@/lib/collaboration/lock-service";
import {
  deleteCommentsByPath,
  migrateCommentPaths,
} from "@/lib/collaboration/comment-service";
import {
  deleteNotificationsByPath,
  migrateNotificationPaths,
} from "@/lib/collaboration/notification-service";

type RouteParams = { params: Promise<{ path: string[] }> };

export function validateRenameTarget(virtualPath: string, rename: unknown): {
  error: string | null;
  status: number | null;
  normalizedName: string | null;
} {
  const renameInput = typeof rename === "string" ? rename.trim() : "";
  if (!renameInput) {
    return { error: "Rename target is required", status: 400, normalizedName: null };
  }

  const normalizedName = slugify(renameInput);
  if (!normalizedName) {
    return { error: "Rename target is invalid", status: 400, normalizedName: null };
  }

  const currentName = virtualPath.split("/").filter(Boolean).at(-1) ?? virtualPath;
  if (normalizedName === currentName) {
    return { error: "Rename target matches current path", status: 409, normalizedName };
  }

  return { error: null, status: null, normalizedName };
}

function commitUser(req: NextRequest) {
  const user = getRequestUser(req);
  return user ? { username: user.username, displayName: user.displayName } : undefined;
}

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

    const page = await readPage(virtualPath);
    return NextResponse.json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
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
      action: "write_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    const user = getRequestUser(req);
    const body = await req.json();

    if (user) {
      const lock = getLock(virtualPath);
      if (lock && lock.user_id !== user.userId) {
        return NextResponse.json(
          {
            error: "Document is locked",
            lockedBy: lock.username,
            acquiredAt: lock.acquired_at,
          },
          { status: 423 }
        );
      }
      if (!lock) {
        acquireLock(virtualPath, user.userId, user.username);
      }
    }

    await writePage(virtualPath, body.content, body.frontmatter);
    autoCommit(virtualPath, "Update", commitUser(req));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
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
      action: "write_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    const user = getRequestUser(req);
    const body = await req.json();
    await createPage(virtualPath, body.title);

    if (user) {
      const page = await readPage(virtualPath);
      await writePage(virtualPath, page.content, {
        ...page.frontmatter,
        owner: user.username,
      });
    }

    autoCommit(virtualPath, "Add", commitUser(req));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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
      action: "write_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    try {
      await readPage(virtualPath);
    } catch {
      return NextResponse.json({ error: `Page not found: ${virtualPath}` }, { status: 404 });
    }

    const body = await req.json();
    if (body.rename) {
      const validation = validateRenameTarget(virtualPath, body.rename);
      if (validation.error || validation.status) {
        return NextResponse.json({ error: validation.error }, { status: validation.status ?? 400 });
      }

      const newPath = await renamePage(virtualPath, String(body.rename).trim());
      migrateLockPaths(virtualPath, newPath);
      migrateCommentPaths(virtualPath, newPath);
      migrateNotificationPaths(virtualPath, newPath);
      return NextResponse.json({ ok: true, newPath });
    }

    const newPath = await movePage(virtualPath, body.toParent || "");
    migrateLockPaths(virtualPath, newPath);
    migrateCommentPaths(virtualPath, newPath);
    migrateNotificationPaths(virtualPath, newPath);
    return NextResponse.json({ ok: true, newPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("already exists")
      ? 409
      : message.includes("not found")
        ? 404
        : message.includes("invalid") || message.includes("required")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
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
      action: "delete_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    if (!(await canDeletePath(virtualPath))) {
      return NextResponse.json({ error: `Page not found: ${virtualPath}` }, { status: 404 });
    }

    await deletePage(virtualPath);
    deleteLocksByPath(virtualPath);
    deleteCommentsByPath(virtualPath);
    deleteNotificationsByPath(virtualPath);
    autoCommit(virtualPath, "Delete", commitUser(req));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
