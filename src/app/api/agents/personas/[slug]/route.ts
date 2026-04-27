import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  readPersona,
  writePersona,
  deletePersona,
  readMemory,
  writeMemory,
  listMemoryFiles,
  readInbox,
  sendMessage,
  getHeartbeatHistoryResult,
} from "@/lib/agents/persona-manager";
import { startManualHeartbeat } from "@/lib/agents/heartbeat";
import { updateGoal, getGoalHistory } from "@/lib/agents/goal-manager";
import { reloadDaemonSchedules } from "@/lib/agents/daemon-client";
import { requireAdmin } from "@/lib/auth/route-guards";
import { isPathInsideDataDir } from "@/lib/storage/path-utils";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);

  // Session output retrieval
  const sessionTs = searchParams.get("session");
  if (sessionTs) {
    const sessionsDir = path.join(DATA_DIR, ".agents", slug, "sessions");
    const sessionFile = path.join(sessionsDir, `${sessionTs.replace(/[:.]/g, "-")}.txt`);
    // Validate path stays within sessions dir
    if (!isPathInsideDataDir(sessionFile) || !sessionFile.startsWith(`${sessionsDir}${path.sep}`)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    try {
      const output = await fs.readFile(sessionFile, "utf-8");
      return NextResponse.json({ output });
    } catch {
      return NextResponse.json({ output: null });
    }
  }

  const cabinetPath = searchParams.get("cabinetPath") || undefined;

  const persona = await readPersona(slug, cabinetPath);
  if (!persona) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const memoryFiles = await listMemoryFiles(slug, cabinetPath);
  const memory: Record<string, string> = {};
  for (const file of memoryFiles) {
    if (file.endsWith(".md")) {
      memory[file] = await readMemory(slug, file, cabinetPath);
    }
  }

  const inbox = await readInbox(slug, cabinetPath);
  const heartbeatHistory = await getHeartbeatHistoryResult(slug, undefined, cabinetPath);
  const goalHistory = await getGoalHistory(slug);

  return NextResponse.json({
    persona,
    memory,
    inbox,
    history: heartbeatHistory.history,
    historyHydration: heartbeatHistory.hydration,
    goalHistory,
  });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const forbidden = await requireAdmin(req);
  if (forbidden) return forbidden;

  const { slug } = await params;
  const body = await req.json();
  const cabinetPath = typeof body.cabinetPath === "string" ? body.cabinetPath : undefined;

  // Handle different update types
  if (body.action === "toggle") {
    const persona = await readPersona(slug, cabinetPath);
    if (!persona) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await writePersona(slug, { active: !persona.active }, cabinetPath);
    await reloadDaemonSchedules().catch(() => {});
    return NextResponse.json({ ok: true, active: !persona.active });
  }

  if (body.action === "run") {
    const session = await startManualHeartbeat(slug, cabinetPath);
    if (!session?.sessionId) {
      return NextResponse.json({ ok: false, message: "Agent inactive or over budget" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...session });
  }

  if (body.action === "updateMemory") {
    await writeMemory(slug, body.file, body.content, cabinetPath);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "sendMessage") {
    await sendMessage(slug, body.to, body.message, cabinetPath);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "updateGoal") {
    const result = await updateGoal(slug, body.metric, body.increment || 1);
    return NextResponse.json({ ok: true, goal: result });
  }

  // Default: update persona
  await writePersona(slug, body, cabinetPath);
  await reloadDaemonSchedules().catch(() => {});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const forbidden = await requireAdmin(req);
  if (forbidden) return forbidden;

  const { slug } = await params;
  const cabinetPath = req.nextUrl.searchParams.get("cabinetPath") || undefined;
  await deletePersona(slug, cabinetPath);
  await reloadDaemonSchedules().catch(() => {});
  return NextResponse.json({ ok: true });
}
