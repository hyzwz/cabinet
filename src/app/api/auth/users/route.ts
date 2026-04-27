import { NextRequest, NextResponse } from "next/server";
import { listUsers, deleteUser, updateUser } from "@/lib/storage/user-io";
import { getCurrentUser } from "@/lib/auth/jwt";
import { isPlatformAdminPayload } from "@/lib/auth/admin-guards";
import { deleteNotificationsByUser, deleteCommentsByUser } from "@/lib/collaboration/notification-service";
import type { SystemRole, UserRole, UserStatus } from "@/types";

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser(req);
  if (!currentUser || !isPlatformAdminPayload(currentUser)) {
    return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
  }

  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser(req);
  if (!currentUser || !isPlatformAdminPayload(currentUser)) {
    return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
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
    // Clean up collaboration data for deleted user
    try {
      deleteNotificationsByUser(userId);
      deleteCommentsByUser(userId);
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      db.prepare("DELETE FROM document_locks WHERE user_id = ?").run(userId);
    } catch {
      // Non-critical — orphaned data will be cleaned by daemon
    }
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

  const { userId, displayName, password, role, systemRole, status } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Non-admin can only update themselves (password & displayName only)
  const isPlatformAdmin = isPlatformAdminPayload(currentUser);
  if (!isPlatformAdmin && userId !== currentUser.userId) {
    return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
  }

  const updates: {
    displayName?: string;
    password?: string;
    role?: UserRole;
    systemRole?: SystemRole;
    status?: UserStatus;
  } = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (password) {
    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }
    updates.password = password;
  }
  // Only admin can change roles
  if (role !== undefined && isPlatformAdmin) {
    updates.role = role;
  }
  if (systemRole !== undefined && isPlatformAdmin) {
    updates.systemRole = systemRole === "platform_admin" ? "platform_admin" : "user";
  }
  if (status !== undefined && isPlatformAdmin) {
    updates.status = status === "pending" || status === "disabled" ? status : "active";
  }

  try {
    const user = await updateUser(userId, updates);
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
