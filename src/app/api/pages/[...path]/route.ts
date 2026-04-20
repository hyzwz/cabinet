import { NextRequest, NextResponse } from "next/server";
import { readPage, writePage, createPage, deletePage, movePage, renamePage } from "@/lib/storage/page-io";
import { autoCommit } from "@/lib/git/git-service";
import { getRequestUser } from "@/lib/auth/request-user";
import { checkPageAccess } from "@/lib/auth/access-control";
import { getLock, acquireLock, deleteLocksByPath, migrateLockPaths } from "@/lib/collaboration/lock-service";
import { deleteCommentsByPath, migrateCommentPaths } from "@/lib/collaboration/comment-service";
import { deleteNotificationsByPath, migrateNotificationPaths } from "@/lib/collaboration/notification-service";

type RouteParams = { params: Promise<{ path: string[] }> };

function commitUser(req: NextRequest) {
  const user = getRequestUser(req);
  return user ? { username: user.username, displayName: user.displayName } : undefined;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");
    const page = await readPage(virtualPath);

    const user = getRequestUser(req);
    const access = checkPageAccess(user, virtualPath, "read", page.frontmatter);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 403 });
    }

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

    const user = getRequestUser(req);
    // Read current page to check ownership/visibility
    try {
      const page = await readPage(virtualPath);
      const access = checkPageAccess(user, virtualPath, "write", page.frontmatter);
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason }, { status: 403 });
      }
    } catch {
      // Page may not exist yet (first save) — allow write if user has editor+ role
      const access = checkPageAccess(user, virtualPath, "write");
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason }, { status: 403 });
      }
    }

    const body = await req.json();

    // Lock validation: if someone else holds a valid lock, reject
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
      // Auto-acquire lock if none exists
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

    const user = getRequestUser(req);
    const access = checkPageAccess(user, virtualPath, "write");
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 403 });
    }

    const body = await req.json();
    await createPage(virtualPath, body.title);

    // Set owner on new pages
    if (user) {
      const page = await readPage(virtualPath);
      await writePage(virtualPath, page.content, { ...page.frontmatter, owner: user.username });
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

    const user = getRequestUser(req);
    try {
      const page = await readPage(virtualPath);
      const access = checkPageAccess(user, virtualPath, "write", page.frontmatter);
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason }, { status: 403 });
      }
    } catch {
      const access = checkPageAccess(user, virtualPath, "write");
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason }, { status: 403 });
      }
    }

    const body = await req.json();
    if (body.rename) {
      const newPath = await renamePage(virtualPath, body.rename);
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");

    const user = getRequestUser(req);
    try {
      const page = await readPage(virtualPath);
      const access = checkPageAccess(user, virtualPath, "delete", page.frontmatter);
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason }, { status: 403 });
      }
    } catch {
      const access = checkPageAccess(user, virtualPath, "delete");
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason }, { status: 403 });
      }
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
