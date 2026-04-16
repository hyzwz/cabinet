import { NextRequest, NextResponse } from "next/server";
import { manualCommit, getStatus } from "@/lib/git/git-service";
import { getRequestUser } from "@/lib/auth/request-user";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message || "Manual commit from KB";
    const user = getRequestUser(req);
    const commitUser = user ? { username: user.username, displayName: user.displayName } : undefined;
    const committed = await manualCommit(message, commitUser);
    return NextResponse.json({ ok: true, committed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const status = await getStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
