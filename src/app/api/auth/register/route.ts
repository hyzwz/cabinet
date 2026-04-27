import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createUser, getUserCount } from "@/lib/storage/user-io";
import { signToken, TOKEN_COOKIE, TOKEN_MAX_AGE } from "@/lib/auth/jwt";
import { getCurrentUser } from "@/lib/auth/jwt";
import { addOrUpdateCompanyMembership, getCompanyByJoinCode } from "@/lib/storage/company-io";
import { isPlatformAdminPayload } from "@/lib/auth/admin-guards";
import type { UserRole } from "@/types";

export async function POST(req: NextRequest) {
  const { username, password, displayName, role, joinCode, companyId, companyRole } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }
  if (username.length < 2 || username.length > 32) {
    return NextResponse.json({ error: "Username must be 2-32 characters" }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  }

  const userCount = await getUserCount();

  // First user: anyone can register (becomes admin)
  if (userCount === 0) {
    try {
      const user = await createUser(username, password, displayName || username, "admin", {
        systemRole: "platform_admin",
        status: "active",
      });
      const token = await signToken(user);
      const cookieStore = await cookies();
      cookieStore.set(TOKEN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" && process.env.KB_ALLOW_HTTP !== "1",
        sameSite: "lax",
        path: "/",
        maxAge: TOKEN_MAX_AGE,
      });
      return NextResponse.json({ ok: true, user, firstUser: true });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  // Subsequent users: admin only
  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    if (!joinCode || typeof joinCode !== "string") {
      return NextResponse.json({ error: "Company join code required" }, { status: 400 });
    }
    const company = await getCompanyByJoinCode(joinCode);
    if (!company) {
      return NextResponse.json({ error: "Invalid company join code" }, { status: 400 });
    }

    try {
      const user = await createUser(username, password, displayName || username, "editor", {
        systemRole: "user",
        status: "pending",
      });
      await addOrUpdateCompanyMembership({
        userId: user.id,
        companyId: company.id,
        role: "company_member",
        status: "pending",
      });
      return NextResponse.json({ ok: true, user, pendingApproval: true, companyId: company.id });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  if (!isPlatformAdminPayload(currentUser)) {
    return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
  }

  const effectiveRole: UserRole = role === "admin" || role === "editor" || role === "viewer" ? role : "editor";

  try {
    const user = await createUser(username, password, displayName || username, effectiveRole, {
      systemRole: effectiveRole === "admin" ? "platform_admin" : "user",
      status: "active",
    });
    if (typeof companyId === "string" && companyId.trim()) {
      await addOrUpdateCompanyMembership({
        userId: user.id,
        companyId,
        role: companyRole === "company_admin" ? "company_admin" : "company_member",
        status: "active",
      });
    }
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
