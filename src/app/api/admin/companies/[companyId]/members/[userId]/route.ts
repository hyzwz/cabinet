import { NextRequest, NextResponse } from "next/server";
import { requireCompanyManager, isPlatformAdminPayload } from "@/lib/auth/admin-guards";
import {
  addOrUpdateCompanyMembership,
  assertCanChangeCompanyAdminMembership,
  getCompanyMembership,
} from "@/lib/storage/company-io";
import { getUserById, syncUserStatusFromMemberships, updateUser } from "@/lib/storage/user-io";
import type { CompanyMembershipStatus, CompanyRole } from "@/types";

type RouteContext = {
  params: Promise<{ companyId: string; userId: string }>;
};

function parseCompanyRole(value: unknown): CompanyRole | undefined {
  if (value === "company_admin" || value === "company_member") return value;
  return undefined;
}

function parseMembershipStatus(value: unknown): CompanyMembershipStatus | undefined {
  if (value === "pending" || value === "active" || value === "rejected" || value === "disabled") {
    return value;
  }
  return undefined;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { companyId, userId } = await context.params;
  const access = await requireCompanyManager(req, companyId);
  if (!access.ok) return access.response;

  const target = await getUserById(userId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!isPlatformAdminPayload(access.user) && target.systemRole === "platform_admin") {
    return NextResponse.json({ error: "Company admins cannot manage platform admins" }, { status: 403 });
  }

  const body = await req.json();
  const currentMembership = await getCompanyMembership(companyId, userId);
  if (!currentMembership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  const nextRole = parseCompanyRole(body.companyRole) || currentMembership.role;
  const nextStatus = parseMembershipStatus(body.membershipStatus) || currentMembership.status;
  if (typeof body.password === "string" && body.password && body.password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  }

  try {
    await assertCanChangeCompanyAdminMembership(companyId, userId, {
      role: nextRole,
      status: nextStatus,
    });

    const membership = await addOrUpdateCompanyMembership({
      userId,
      companyId,
      role: nextRole,
      status: nextStatus,
    });

    if (typeof body.displayName === "string" && body.displayName.trim()) {
      await updateUser(userId, { displayName: body.displayName.trim() });
    }
    if (typeof body.password === "string" && body.password) {
      await updateUser(userId, { password: body.password });
    }

    const user = await syncUserStatusFromMemberships(userId);
    return NextResponse.json({ ok: true, membership, user });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
