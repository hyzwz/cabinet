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
  getComments,
  addComment,
  updateComment,
  deleteComment,
} from "@/lib/collaboration/comment-service";
import { notifyPageOwnerOfComment } from "@/lib/collaboration/notification-service";
import { readPage } from "@/lib/storage/page-io";
import { getUserByUsername } from "@/lib/storage/user-io";

type RouteParams = { params: Promise<{ path: string[] }> };

// GET /api/comments/[...path] — get all comments for a page
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

    const comments = getComments(virtualPath);
    return NextResponse.json(comments);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/comments/[...path] — add a comment
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
      action: "read_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    const user = getRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const comment = addComment(
      virtualPath,
      user.userId,
      user.displayName || user.username,
      body.content.trim(),
      body.parentId
    );

    try {
      const page = await readPage(virtualPath);
      const pageOwnerUsername = page.frontmatter?.owner as string | undefined;
      if (pageOwnerUsername && pageOwnerUsername !== user.username) {
        const ownerUser = await getUserByUsername(pageOwnerUsername);
        if (ownerUser) {
          const pageTitle =
            (page.frontmatter?.title as string) || virtualPath.split("/").pop() || virtualPath;
          notifyPageOwnerOfComment(
            ownerUser.id,
            virtualPath,
            pageTitle,
            user.displayName || user.username
          );
        }
      }
    } catch {
      // Page might not have owner or reading failed — skip notification
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/comments/[...path]?id=xxx — update a comment
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
      action: "read_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    const user = getRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json(
        { error: "Comment id is required" },
        { status: 400 }
      );
    }

    const success = updateComment(
      body.id,
      user.userId,
      user.role === "admin",
      { content: body.content, resolved: body.resolved }
    );

    if (!success) {
      return NextResponse.json(
        { error: "Comment not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/comments/[...path]?id=xxx — delete a comment
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
      action: "read_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    const user = getRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const commentId = req.nextUrl.searchParams.get("id");
    if (!commentId) {
      return NextResponse.json(
        { error: "Comment id is required" },
        { status: 400 }
      );
    }

    const success = deleteComment(
      commentId,
      user.userId,
      user.role === "admin"
    );

    if (!success) {
      return NextResponse.json(
        { error: "Comment not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
