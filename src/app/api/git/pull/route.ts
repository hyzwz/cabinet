import { NextRequest, NextResponse } from "next/server";
import { gitPull } from "@/lib/git/git-service";
import { getRequestUser } from "@/lib/auth/request-user";
import { requireAdmin } from "@/lib/auth/access-control";

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const access = requireAdmin(user);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 403 });
    }

    const result = await gitPull();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ pulled: false, summary: message }, { status: 500 });
  }
}
