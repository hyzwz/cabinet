import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateUser, getUserCount } from "@/lib/storage/user-io";
import { signToken, TOKEN_COOKIE, TOKEN_MAX_AGE } from "@/lib/auth/jwt";

const KB_PASSWORD = process.env.KB_PASSWORD || "";

async function hashLegacyToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "cabinet-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userCount = await getUserCount();

  // Multi-user mode: users exist in users.json
  if (userCount > 0) {
    const { username, password } = body;
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signToken(user);
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.KB_ALLOW_HTTP !== "1",
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_MAX_AGE,
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    });
  }

  // Legacy single-password mode (KB_PASSWORD set, no users created)
  if (KB_PASSWORD) {
    const { password } = body;
    if (password !== KB_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = await hashLegacyToken(password);
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.KB_ALLOW_HTTP !== "1",
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_MAX_AGE,
    });

    return NextResponse.json({ ok: true });
  }

  // No auth configured
  return NextResponse.json({ ok: true });
}
