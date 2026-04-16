import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { CABINET_INTERNAL_DIR } from "./path-utils";
import { ensureDirectory } from "./fs-operations";
import type { User, SafeUser, UserRole } from "@/types";

const USERS_FILE = path.join(CABINET_INTERNAL_DIR, "users.json");

async function readUsersFile(): Promise<User[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(raw) as User[];
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
  return users.map(toSafeUser);
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
  role?: UserRole
): Promise<SafeUser> {
  const users = await readUsersFile();

  if (users.find((u) => u.username === username)) {
    throw new Error("Username already exists");
  }

  // First user becomes admin
  const effectiveRole = role ?? (users.length === 0 ? "admin" : "editor");

  const { hash } = hashPassword(password);
  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    username,
    displayName,
    passwordHash: hash,
    role: effectiveRole,
    createdAt: now,
    updatedAt: now,
  };

  users.push(user);
  await writeUsersFile(users);
  return toSafeUser(user);
}

export async function updateUser(
  id: string,
  updates: { displayName?: string; password?: string; role?: UserRole }
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
  user.updatedAt = new Date().toISOString();

  users[idx] = user;
  await writeUsersFile(users);
  return toSafeUser(user);
}

export async function deleteUser(id: string): Promise<void> {
  const users = await readUsersFile();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  // Prevent deleting last admin
  const user = users[idx]!;
  if (user.role === "admin") {
    const adminCount = users.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) throw new Error("Cannot delete the last admin");
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
  if (!verifyPassword(password, user.passwordHash)) return null;
  return toSafeUser(user);
}
