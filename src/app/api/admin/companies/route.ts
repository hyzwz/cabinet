import { NextRequest, NextResponse } from "next/server";
import { isPlatformAdminPayload, requirePlatformAdmin } from "@/lib/auth/admin-guards";
import { getCurrentUser } from "@/lib/auth/jwt";
import {
  addOrUpdateCompanyMembership,
  buildCompanyMemberViews,
  createCompany,
  listCompanies,
  listCompanyMemberships,
  summarizeCompanies,
} from "@/lib/storage/company-io";
import { createUser, listUsers } from "@/lib/storage/user-io";

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await listUsers();
  const allCompanies = await listCompanies();
  const memberships = await listCompanyMemberships();
  const companies = isPlatformAdminPayload(currentUser)
    ? allCompanies
    : allCompanies.filter((company) =>
        memberships.some(
          (membership) =>
            membership.companyId === company.id &&
            membership.userId === currentUser.userId &&
            membership.status === "active" &&
            membership.role === "company_admin",
        ),
      );

  return NextResponse.json({
    companies: summarizeCompanies(companies, memberships),
    membersByCompanyId: Object.fromEntries(
      companies.map((company) => [
        company.id,
        buildCompanyMemberViews(users, memberships, company.id),
      ]),
    ),
  });
}

export async function POST(req: NextRequest) {
  const access = await requirePlatformAdmin(req);
  if (!access.ok) return access.response;

  const body = await req.json();
  try {
    const company = await createCompany({
      name: String(body.name || ""),
      slug: typeof body.slug === "string" ? body.slug : undefined,
    });

    let firstAdmin = null;
    if (body.adminUsername && body.adminPassword) {
      firstAdmin = await createUser(
        String(body.adminUsername),
        String(body.adminPassword),
        String(body.adminDisplayName || body.adminUsername),
        "editor",
        { systemRole: "user", status: "active" },
      );
      await addOrUpdateCompanyMembership({
        userId: firstAdmin.id,
        companyId: company.id,
        role: "company_admin",
        status: "active",
      });
    }

    return NextResponse.json({ ok: true, company, firstAdmin });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
