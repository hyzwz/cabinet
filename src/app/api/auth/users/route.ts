import { NextRequest, NextResponse } from "next/server";
import { listUsers, deleteUser, updateUser } from "@/lib/storage/user-io";
import { getCurrentUser } from "@/lib/auth/jwt";
import type { UserRole } from "@/types";

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (userId === currentUser.userId) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  try {
    await deleteUser(userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, displayName, password, role } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Non-admin can only update themselves (password & displayName only)
  if (currentUser.role !== "admin" && userId !== currentUser.userId) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const updates: { displayName?: string; password?: string; role?: UserRole } = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (password) {
    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }
    updates.password = password;
  }
  // Only admin can change roles
  if (role !== undefined && currentUser.role === "admin") {
    updates.role = role;
  }

  try {
    const user = await updateUser(userId, updates);
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
