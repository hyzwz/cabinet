import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/route-guards";
import {
  buildCompanyMemberViews,
  isPlatformAdminUser,
  summarizeCompanies,
} from "@/lib/storage/company-io";
import type { Company, CompanyMembership, SafeUser } from "@/types";

function requestWithHeaders(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/test", { headers: new Headers(headers) });
}

const now = "2026-04-24T00:00:00.000Z";

test("platform admin system role is treated as admin for route guards", async () => {
  const forbidden = await requireAdmin(requestWithHeaders({
    "x-user-id": "user-1",
    "x-user-name": "owner",
    "x-user-role": "editor",
    "x-system-role": "platform_admin",
  }));

  assert.equal(forbidden, null);
});

test("legacy admin role remains platform-admin compatible", () => {
  assert.equal(isPlatformAdminUser({ role: "admin", systemRole: "user" }), true);
  assert.equal(isPlatformAdminUser({ role: "editor", systemRole: "platform_admin" }), true);
  assert.equal(isPlatformAdminUser({ role: "editor", systemRole: "user" }), false);
});

test("company summaries count active admins, active members, and pending approvals", () => {
  const companies: Company[] = [{
    id: "company-1",
    name: "Acme",
    slug: "acme",
    status: "active",
    joinCode: "ABCD1234",
    createdAt: now,
    updatedAt: now,
  }];
  const memberships: CompanyMembership[] = [
    { userId: "u1", companyId: "company-1", role: "company_admin", status: "active", createdAt: now, updatedAt: now },
    { userId: "u2", companyId: "company-1", role: "company_member", status: "active", createdAt: now, updatedAt: now },
    { userId: "u3", companyId: "company-1", role: "company_member", status: "pending", createdAt: now, updatedAt: now },
    { userId: "u4", companyId: "company-1", role: "company_admin", status: "disabled", createdAt: now, updatedAt: now },
  ];

  const [summary] = summarizeCompanies(companies, memberships);

  assert.equal(summary?.memberCount, 2);
  assert.equal(summary?.adminCount, 1);
  assert.equal(summary?.pendingCount, 1);
});

test("company member views put pending registrations first", () => {
  const users: SafeUser[] = [
    { id: "active", username: "active", displayName: "Active", role: "editor", systemRole: "user", status: "active", createdAt: now, updatedAt: now },
    { id: "pending", username: "pending", displayName: "Pending", role: "editor", systemRole: "user", status: "pending", createdAt: now, updatedAt: now },
  ];
  const memberships: CompanyMembership[] = [
    { userId: "active", companyId: "company-1", role: "company_member", status: "active", createdAt: now, updatedAt: now },
    { userId: "pending", companyId: "company-1", role: "company_member", status: "pending", createdAt: now, updatedAt: now },
  ];

  const views = buildCompanyMemberViews(users, memberships, "company-1");

  assert.equal(views[0]?.id, "pending");
  assert.equal(views[0]?.membershipStatus, "pending");
  assert.equal(views[1]?.id, "active");
});
