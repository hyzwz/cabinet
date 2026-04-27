import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { CABINET_INTERNAL_DIR } from "./path-utils";
import { ensureDirectory } from "./fs-operations";
import { ensureOrganizationForUsers, listMembershipsForUser } from "./company-io";
import type { SafeUser, SystemRole, User, UserRole, UserStatus } from "@/types";

const USERS_FILE = path.join(CABINET_INTERNAL_DIR, "users.json");

function normalizeUser(value: Partial<User>): User | null {
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const username = typeof value.username === "string" && value.username.trim() ? value.username.trim() : "";
  const displayName = typeof value.displayName === "string" && value.displayName.trim()
    ? value.displayName.trim()
    : username;
  const passwordHash = typeof value.passwordHash === "string" ? value.passwordHash : "";
  if (!id || !username || !passwordHash) return null;

  const role: UserRole =
    value.role === "admin" || value.role === "viewer" || value.role === "editor"
      ? value.role
      : "editor";
  const systemRole: SystemRole =
    value.systemRole === "platform_admin" || role === "admin" ? "platform_admin" : "user";
  const status: UserStatus =
    value.status === "pending" || value.status === "disabled" ? value.status : "active";
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString();

  return {
    id,
    username,
    displayName,
    passwordHash,
    role,
    systemRole,
    status,
    createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : createdAt,
  };
}

async function readUsersFile(): Promise<User[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<User>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeUser).filter((user): user is User => Boolean(user));
  } catch {
    return [];
  }
}

async function writeUsersFile(users: User[]): Promise<void> {
  await ensureDirectory(CABINET_INTERNAL_DIR);
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return { hash: `${s}:${hash}`, salt: s };
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const { hash: computed } = hashPassword(password, salt);
  const [, computedHash] = computed.split(":");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(computedHash!, "hex")
  );
}

function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function getUserCount(): Promise<number> {
  const users = await readUsersFile();
  return users.length;
}

export async function listUsers(): Promise<SafeUser[]> {
  const users = await readUsersFile();
  const safeUsers = users.map(toSafeUser);
  await ensureOrganizationForUsers(safeUsers);
  return safeUsers;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await readUsersFile();
  return users.find((u) => u.id === id) || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await readUsersFile();
  return users.find((u) => u.username === username) || null;
}

export async function createUser(
  username: string,
  password: string,
  displayName: string,
  role?: UserRole,
  options: { systemRole?: SystemRole; status?: UserStatus } = {},
): Promise<SafeUser> {
  const users = await readUsersFile();

  if (users.find((u) => u.username === username)) {
    throw new Error("Username already exists");
  }

  // First user becomes admin
  const effectiveRole = role ?? (users.length === 0 ? "admin" : "editor");
  const systemRole = options.systemRole ?? (effectiveRole === "admin" ? "platform_admin" : "user");
  const status = options.status ?? "active";

  const { hash } = hashPassword(password);
  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    username,
    displayName,
    passwordHash: hash,
    role: effectiveRole,
    systemRole,
    status,
    createdAt: now,
    updatedAt: now,
  };

  users.push(user);
  await writeUsersFile(users);
  const safeUser = toSafeUser(user);
  if (status === "active") {
    await ensureOrganizationForUsers(users.map(toSafeUser));
  }
  return safeUser;
}

export async function updateUser(
  id: string,
  updates: {
    displayName?: string;
    password?: string;
    role?: UserRole;
    systemRole?: SystemRole;
    status?: UserStatus;
  }
): Promise<SafeUser> {
  const users = await readUsersFile();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  const user = users[idx]!;
  if (updates.displayName !== undefined) user.displayName = updates.displayName;
  if (updates.password) {
    const { hash } = hashPassword(updates.password);
    user.passwordHash = hash;
  }
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.systemRole !== undefined) user.systemRole = updates.systemRole;
  if (updates.status !== undefined) user.status = updates.status;
  user.updatedAt = new Date().toISOString();

  users[idx] = user;
  await writeUsersFile(users);
  return toSafeUser(user);
}

export async function deleteUser(id: string): Promise<void> {
  const users = await readUsersFile();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  // Prevent deleting last platform admin
  const user = users[idx]!;
  if (user.systemRole === "platform_admin" || user.role === "admin") {
    const adminCount = users.filter((u) => u.systemRole === "platform_admin" || u.role === "admin").length;
    if (adminCount <= 1) throw new Error("Cannot delete the last platform admin");
  }

  users.splice(idx, 1);
  await writeUsersFile(users);
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<SafeUser | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;
  if (user.status !== "active") return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return toSafeUser(user);
}

export async function authenticateUserWithStatus(
  username: string,
  password: string
): Promise<{ user: SafeUser | null; status: UserStatus | "invalid" }> {
  const user = await getUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { user: null, status: "invalid" };
  }
  if (user.status !== "active") {
    return { user: null, status: user.status };
  }
  return { user: toSafeUser(user), status: "active" };
}

export async function syncUserStatusFromMemberships(userId: string): Promise<SafeUser> {
  const memberships = await listMembershipsForUser(userId);
  const hasActiveMembership = memberships.some((membership) => membership.status === "active");
  const hasPendingMembership = memberships.some((membership) => membership.status === "pending");
  const nextStatus: UserStatus = hasActiveMembership ? "active" : hasPendingMembership ? "pending" : "disabled";
  return updateUser(userId, { status: nextStatus });
}
