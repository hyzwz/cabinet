import { NextRequest, NextResponse } from "next/server";
import { sendNotification } from "@/lib/agents/notification-service";
import { requireAdmin } from "@/lib/auth/route-guards";

export async function POST(req: NextRequest) {
  try {
    const forbidden = await requireAdmin(req);
    if (forbidden) return forbidden;

    const result = await sendNotification({
      title: "Cabinet Test Notification",
      message: "If you see this, your notification setup is working correctly!",
      agentName: "Cabinet System",
      agentEmoji: "\u{2705}",
      channel: "test",
      severity: "info",
    });

    if (result.sent.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "No notification channels are configured or enabled. Check Settings > Notifications.",
      });
    }

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      message: `Test notification sent via: ${result.sent.join(", ")}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: `Error: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 },
    );
  }
}
