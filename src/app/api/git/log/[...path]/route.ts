import { NextRequest, NextResponse } from "next/server";
import { getPageHistory } from "@/lib/git/git-service";
import { getRequestUser } from "@/lib/auth/request-user";
import { checkPageAccess } from "@/lib/auth/access-control";
import { readPage } from "@/lib/storage/page-io";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");

    const user = getRequestUser(req);
    try {
      const page = await readPage(virtualPath);
      const access = checkPageAccess(user, virtualPath, "read", page.frontmatter);
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason }, { status: 403 });
      }
    } catch {
      // Page may not exist (deleted) — allow admin, deny others
      if (user && user.role !== "admin") {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const history = await getPageHistory(virtualPath);
    return NextResponse.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
