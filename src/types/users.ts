export type UserRole = "admin" | "editor" | "viewer";
export type SystemRole = "platform_admin" | "user";
export type UserStatus = "pending" | "active" | "disabled";
export type CompanyStatus = "active" | "disabled";
export type CompanyRole = "company_admin" | "company_member";
export type CompanyMembershipStatus = "pending" | "active" | "rejected" | "disabled";

export interface User {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  systemRole: SystemRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

export interface Company {
  id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  joinCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMembership {
  userId: string;
  companyId: string;
  role: CompanyRole;
  status: CompanyMembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySummary extends Company {
  memberCount: number;
  adminCount: number;
  pendingCount: number;
}

export interface CompanyMemberView extends SafeUser {
  companyId: string;
  companyRole: CompanyRole;
  membershipStatus: CompanyMembershipStatus;
  membershipCreatedAt: string;
  membershipUpdatedAt: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  systemRole: SystemRole;
  status: UserStatus;
}

export type PageVisibility = "team" | "private";
