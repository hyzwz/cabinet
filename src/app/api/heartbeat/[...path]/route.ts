import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { refreshHeartbeat } from "@/lib/collaboration/lock-service";

type RouteParams = { params: Promise<{ path: string[] }> };

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

    const success = refreshHeartbeat(virtualPath, user.userId);
    if (!success) {
      return NextResponse.json(
        { error: "No active lock for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
