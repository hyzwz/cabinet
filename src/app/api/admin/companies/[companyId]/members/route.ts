import { NextRequest, NextResponse } from "next/server";
import { requireCompanyManager } from "@/lib/auth/admin-guards";
import {
  buildCompanyMemberViews,
  listCompanyMemberships,
} from "@/lib/storage/company-io";
import { listUsers } from "@/lib/storage/user-io";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const access = await requireCompanyManager(req, companyId);
  if (!access.ok) return access.response;

  const users = await listUsers();
  const memberships = await listCompanyMemberships();
  return NextResponse.json({
    companyId,
    members: buildCompanyMemberViews(users, memberships, companyId),
  });
}
