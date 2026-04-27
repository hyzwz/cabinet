import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/jwt";
import { getCompany, getCompanyMembership } from "@/lib/storage/company-io";
import type { JwtPayload } from "@/types";

export function isPlatformAdminPayload(user: Pick<JwtPayload, "role" | "systemRole">): boolean {
  return user.systemRole === "platform_admin" || user.role === "admin";
}

export async function requirePlatformAdmin(req: NextRequest): Promise<
  | { ok: true; user: JwtPayload }
  | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser(req);
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isPlatformAdminPayload(user)) {
    return { ok: false, response: NextResponse.json({ error: "Platform admin access required" }, { status: 403 }) };
  }
  return { ok: true, user };
}

export async function requireCompanyManager(
  req: NextRequest,
  companyId: string,
): Promise<
  | { ok: true; user: JwtPayload; scope: "platform" | "company" }
  | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser(req);
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (isPlatformAdminPayload(user)) {
    return { ok: true, user, scope: "platform" };
  }

  const company = await getCompany(companyId);
  if (!company || company.status !== "active") {
    return { ok: false, response: NextResponse.json({ error: "Company not found" }, { status: 404 }) };
  }

  const membership = await getCompanyMembership(companyId, user.userId);
  if (membership?.status === "active" && membership.role === "company_admin") {
    return { ok: true, user, scope: "company" };
  }

  return { ok: false, response: NextResponse.json({ error: "Company admin access required" }, { status: 403 }) };
}
