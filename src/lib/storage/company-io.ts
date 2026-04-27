import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { CABINET_INTERNAL_DIR, slugify } from "./path-utils";
import { ensureDirectory } from "./fs-operations";
import type {
  Company,
  CompanyMemberView,
  CompanyMembership,
  CompanyMembershipStatus,
  CompanyRole,
  CompanyStatus,
  SafeUser,
} from "@/types";

const COMPANIES_FILE = path.join(CABINET_INTERNAL_DIR, "companies.json");
const MEMBERSHIPS_FILE = path.join(CABINET_INTERNAL_DIR, "company-memberships.json");
const DEFAULT_COMPANY_ID = "default-company";

type CompanyInput = {
  name: string;
  slug?: string;
  status?: CompanyStatus;
};

type MembershipInput = {
  userId: string;
  companyId: string;
  role: CompanyRole;
  status: CompanyMembershipStatus;
};

function nowIso(): string {
  return new Date().toISOString();
}

function generateJoinCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function normalizeSlug(value: string, fallback: string): string {
  return (slugify(value || fallback) || fallback).slice(0, 64);
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  await ensureDirectory(CABINET_INTERNAL_DIR);
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeCompany(value: Partial<Company>): Company | null {
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  if (!id || !name) return null;
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : nowIso();
  return {
    id,
    name,
    slug: normalizeSlug(value.slug || name, id),
    status: value.status === "disabled" ? "disabled" : "active",
    joinCode: typeof value.joinCode === "string" && value.joinCode.trim()
      ? value.joinCode.trim().toUpperCase()
      : generateJoinCode(),
    createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : createdAt,
  };
}

function normalizeMembership(value: Partial<CompanyMembership>): CompanyMembership | null {
  const userId = typeof value.userId === "string" && value.userId.trim() ? value.userId.trim() : "";
  const companyId = typeof value.companyId === "string" && value.companyId.trim() ? value.companyId.trim() : "";
  if (!userId || !companyId) return null;
  const role = value.role === "company_admin" ? "company_admin" : "company_member";
  const status: CompanyMembershipStatus =
    value.status === "pending" || value.status === "rejected" || value.status === "disabled"
      ? value.status
      : "active";
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : nowIso();
  return {
    userId,
    companyId,
    role,
    status,
    createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : createdAt,
  };
}

async function readCompaniesFile(): Promise<Company[]> {
  const values = await readJsonFile<Partial<Company>[]>(COMPANIES_FILE, []);
  return values.map(normalizeCompany).filter((value): value is Company => Boolean(value));
}

async function writeCompaniesFile(companies: Company[]): Promise<void> {
  await writeJsonFile(COMPANIES_FILE, companies);
}

async function readMembershipsFile(): Promise<CompanyMembership[]> {
  const values = await readJsonFile<Partial<CompanyMembership>[]>(MEMBERSHIPS_FILE, []);
  return values.map(normalizeMembership).filter((value): value is CompanyMembership => Boolean(value));
}

async function writeMembershipsFile(memberships: CompanyMembership[]): Promise<void> {
  await writeJsonFile(MEMBERSHIPS_FILE, memberships);
}

export function isPlatformAdminUser(user: Pick<SafeUser, "role" | "systemRole">): boolean {
  return user.systemRole === "platform_admin" || user.role === "admin";
}

export async function ensureOrganizationForUsers(users: SafeUser[]): Promise<void> {
  if (users.length === 0) return;

  let companies = await readCompaniesFile();
  if (companies.length === 0) {
    const firstCompanyName = "Default Company";
    const createdAt = nowIso();
    companies = [{
      id: DEFAULT_COMPANY_ID,
      name: firstCompanyName,
      slug: normalizeSlug(firstCompanyName, DEFAULT_COMPANY_ID),
      status: "active",
      joinCode: generateJoinCode(),
      createdAt,
      updatedAt: createdAt,
    }];
    await writeCompaniesFile(companies);
  }

  const defaultCompany = companies[0]!;
  const memberships = await readMembershipsFile();
  const existing = new Set(memberships.map((membership) => `${membership.companyId}:${membership.userId}`));
  let changed = false;

  for (const user of users) {
    const key = `${defaultCompany.id}:${user.id}`;
    if (existing.has(key)) continue;
    const createdAt = nowIso();
    memberships.push({
      userId: user.id,
      companyId: defaultCompany.id,
      role: isPlatformAdminUser(user) ? "company_admin" : "company_member",
      status: user.status === "pending" ? "pending" : user.status === "disabled" ? "disabled" : "active",
      createdAt,
      updatedAt: createdAt,
    });
    existing.add(key);
    changed = true;
  }

  if (changed) {
    await writeMembershipsFile(memberships);
  }
}

export async function listCompanies(): Promise<Company[]> {
  return readCompaniesFile();
}

export async function listCompanyMemberships(): Promise<CompanyMembership[]> {
  return readMembershipsFile();
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const companies = await readCompaniesFile();
  return companies.find((company) => company.id === companyId) || null;
}

export async function getCompanyByJoinCode(joinCode: string): Promise<Company | null> {
  const normalized = joinCode.trim().toUpperCase();
  if (!normalized) return null;
  const companies = await readCompaniesFile();
  return companies.find((company) => company.status === "active" && company.joinCode === normalized) || null;
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  const name = input.name.trim();
  if (!name) throw new Error("Company name required");

  const companies = await readCompaniesFile();
  const slug = normalizeSlug(input.slug || name, name);
  if (companies.some((company) => company.slug === slug)) {
    throw new Error("Company slug already exists");
  }

  const createdAt = nowIso();
  const company: Company = {
    id: crypto.randomUUID(),
    name,
    slug,
    status: input.status || "active",
    joinCode: generateJoinCode(),
    createdAt,
    updatedAt: createdAt,
  };

  companies.push(company);
  await writeCompaniesFile(companies);
  return company;
}

export async function updateCompany(
  companyId: string,
  updates: { name?: string; status?: CompanyStatus; refreshJoinCode?: boolean },
): Promise<Company> {
  const companies = await readCompaniesFile();
  const idx = companies.findIndex((company) => company.id === companyId);
  if (idx === -1) throw new Error("Company not found");

  const company = { ...companies[idx]! };
  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name) throw new Error("Company name required");
    company.name = name;
    company.slug = normalizeSlug(name, company.id);
  }
  if (updates.status) company.status = updates.status;
  if (updates.refreshJoinCode) company.joinCode = generateJoinCode();
  company.updatedAt = nowIso();

  companies[idx] = company;
  await writeCompaniesFile(companies);
  return company;
}

export async function addOrUpdateCompanyMembership(input: MembershipInput): Promise<CompanyMembership> {
  const companies = await readCompaniesFile();
  if (!companies.some((company) => company.id === input.companyId)) {
    throw new Error("Company not found");
  }

  const memberships = await readMembershipsFile();
  const idx = memberships.findIndex(
    (membership) => membership.companyId === input.companyId && membership.userId === input.userId,
  );
  const updatedAt = nowIso();
  const next: CompanyMembership = idx >= 0
    ? { ...memberships[idx]!, role: input.role, status: input.status, updatedAt }
    : {
        userId: input.userId,
        companyId: input.companyId,
        role: input.role,
        status: input.status,
        createdAt: updatedAt,
        updatedAt,
      };

  if (idx >= 0) memberships[idx] = next;
  else memberships.push(next);

  await writeMembershipsFile(memberships);
  return next;
}

export async function getCompanyMembership(
  companyId: string,
  userId: string,
): Promise<CompanyMembership | null> {
  const memberships = await readMembershipsFile();
  return memberships.find((membership) => membership.companyId === companyId && membership.userId === userId) || null;
}

export async function listMembershipsForUser(userId: string): Promise<CompanyMembership[]> {
  const memberships = await readMembershipsFile();
  return memberships.filter((membership) => membership.userId === userId);
}

export async function listActiveCompanyAdminIds(companyId: string): Promise<string[]> {
  const memberships = await readMembershipsFile();
  return memberships
    .filter(
      (membership) =>
        membership.companyId === companyId &&
        membership.role === "company_admin" &&
        membership.status === "active",
    )
    .map((membership) => membership.userId);
}

export async function assertCanChangeCompanyAdminMembership(
  companyId: string,
  targetUserId: string,
  next: { role?: CompanyRole; status?: CompanyMembershipStatus },
): Promise<void> {
  const current = await getCompanyMembership(companyId, targetUserId);
  if (!current || current.role !== "company_admin" || current.status !== "active") return;
  const nextRole = next.role || current.role;
  const nextStatus = next.status || current.status;
  if (nextRole === "company_admin" && nextStatus === "active") return;

  const activeAdminIds = await listActiveCompanyAdminIds(companyId);
  if (activeAdminIds.length <= 1 && activeAdminIds.includes(targetUserId)) {
    throw new Error("Cannot remove the last company admin");
  }
}

export function summarizeCompanies(
  companies: Company[],
  memberships: CompanyMembership[],
) {
  return companies.map((company) => {
    const companyMemberships = memberships.filter((membership) => membership.companyId === company.id);
    return {
      ...company,
      memberCount: companyMemberships.filter((membership) => membership.status === "active").length,
      adminCount: companyMemberships.filter(
        (membership) => membership.status === "active" && membership.role === "company_admin",
      ).length,
      pendingCount: companyMemberships.filter((membership) => membership.status === "pending").length,
    };
  });
}

export function buildCompanyMemberViews(
  users: SafeUser[],
  memberships: CompanyMembership[],
  companyId: string,
): CompanyMemberView[] {
  const byUserId = new Map(users.map((user) => [user.id, user]));
  return memberships
    .filter((membership) => membership.companyId === companyId)
    .map((membership) => {
      const user = byUserId.get(membership.userId);
      if (!user) return null;
      return {
        ...user,
        companyId,
        companyRole: membership.role,
        membershipStatus: membership.status,
        membershipCreatedAt: membership.createdAt,
        membershipUpdatedAt: membership.updatedAt,
      };
    })
    .filter((member): member is CompanyMemberView => Boolean(member))
    .sort((left, right) => {
      if (left.membershipStatus !== right.membershipStatus) {
        return left.membershipStatus === "pending" ? -1 : 1;
      }
      return left.username.localeCompare(right.username);
    });
}
