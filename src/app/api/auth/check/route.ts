import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserCount } from "@/lib/storage/user-io";
import { verifyToken, TOKEN_COOKIE } from "@/lib/auth/jwt";

const KB_PASSWORD = process.env.KB_PASSWORD || "";

async function hashLegacyToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "cabinet-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(req: NextRequest) {
  const userCount = await getUserCount();
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;

  // Multi-user mode
  if (userCount > 0) {
    if (!token) {
      return NextResponse.json({ authenticated: false, authEnabled: true, mode: "multi" });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, authEnabled: true, mode: "multi" });
    }
    return NextResponse.json({
      authenticated: true,
      authEnabled: true,
      mode: "multi",
      user: { userId: payload.userId, username: payload.username, displayName: payload.displayName, role: payload.role },
    });
  }

  // Legacy single-password mode
  if (KB_PASSWORD) {
    const expected = await hashLegacyToken(KB_PASSWORD);
    const authenticated = token === expected;
    return NextResponse.json({ authenticated, authEnabled: true, mode: "legacy" });
  }

  // No auth — needs setup (no users, no KB_PASSWORD)
  return NextResponse.json({ authenticated: true, authEnabled: false, mode: "none", needsSetup: true });
}
