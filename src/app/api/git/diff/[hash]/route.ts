import { NextRequest, NextResponse } from "next/server";
import { getDiff } from "@/lib/git/git-service";
import { getRequestUser } from "@/lib/auth/request-user";
import { requireAdmin } from "@/lib/auth/access-control";

type RouteParams = { params: Promise<{ hash: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = getRequestUser(req);
    const access = requireAdmin(user);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 403 });
    }

    const { hash } = await params;
    const diff = await getDiff(hash);
    return NextResponse.json({ diff });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
