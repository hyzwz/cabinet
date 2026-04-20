import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/request-user";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/lib/collaboration/notification-service";

// GET /api/notifications — get current user's notifications
export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const unreadOnly =
      req.nextUrl.searchParams.get("unread") === "true";
    const limit = parseInt(
      req.nextUrl.searchParams.get("limit") || "50",
      10
    );
    const offset = parseInt(
      req.nextUrl.searchParams.get("offset") || "0",
      10
    );

    const notifications = getNotifications(user.userId, {
      unreadOnly,
      limit,
      offset,
    });
    const unreadCount = getUnreadCount(user.userId);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/notifications — mark notification(s) as read
export async function PUT(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (body.readAll) {
      const count = markAllAsRead(user.userId);
      return NextResponse.json({ ok: true, markedCount: count });
    }

    if (body.id) {
      const success = markAsRead(body.id, user.userId);
      if (!success) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Provide 'id' or 'readAll: true'" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
