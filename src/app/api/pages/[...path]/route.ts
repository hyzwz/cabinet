import { NextRequest, NextResponse } from "next/server";
import { readPage, writePage, createPage, deletePage, movePage, renamePage } from "@/lib/storage/page-io";
import { autoCommit } from "@/lib/git/git-service";
import { getRequestUser } from "@/lib/auth/request-user";

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

    // Page visibility check
    const user = getRequestUser(req);
    if (page.frontmatter.visibility === "private" && page.frontmatter.owner && user?.username !== page.frontmatter.owner && user?.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
    const body = await req.json();
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
    const body = await req.json();
    await createPage(virtualPath, body.title);

    // Set owner on new pages
    const user = getRequestUser(req);
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
    const body = await req.json();
    if (body.rename) {
      const newPath = await renamePage(virtualPath, body.rename);
      return NextResponse.json({ ok: true, newPath });
    }
    const newPath = await movePage(virtualPath, body.toParent || "");
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
    await deletePage(virtualPath);
    autoCommit(virtualPath, "Delete", commitUser(req));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
