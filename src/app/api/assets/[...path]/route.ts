import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { resolveContentPath } from "@/lib/storage/path-utils";
import { ensureDirectory, fileExists } from "@/lib/storage/fs-operations";
import { autoCommit } from "@/lib/git/git-service";
import {
  authorizeUserAction,
  resolveActorFromRequest,
  resolveCabinetContextForResource,
  resolveCompanyContextForRequest,
  resolvePageDerivedResourceContext,
  toHttpErrorResponse,
} from "@/lib/auth/page-authorization";
import fs from "fs/promises";

const TEXTUAL_CONTENT_TYPES = new Set([
  "application/javascript",
  "application/json",
  "application/xml",
  "image/svg+xml",
  "text/css",
  "text/csv",
  "text/html",
  "text/plain",
  "text/xml",
  "text/yaml",
]);

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".pdf": "application/pdf",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".css": "text/css",
  ".js": "application/javascript",
  ".html": "text/html",
  ".csv": "text/csv",
  ".json": "application/json",
  ".xml": "application/xml",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".txt": "text/plain",
};

function isTextLikeAssetRequest(req: NextRequest, virtualPath: string): boolean {
  const ext = path.extname(virtualPath).toLowerCase();
  const contentType = req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";

  return (
    contentType.startsWith("text/") ||
    TEXTUAL_CONTENT_TYPES.has(contentType) ||
    ext === ".svg" ||
    ext === ".txt" ||
    ext === ".md" ||
    ext === ".json" ||
    ext === ".js" ||
    ext === ".mjs" ||
    ext === ".cjs" ||
    ext === ".ts" ||
    ext === ".tsx" ||
    ext === ".css" ||
    ext === ".html" ||
    ext === ".xml" ||
    ext === ".yaml" ||
    ext === ".yml" ||
    ext === ".csv"
  );
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");

    const actor = await resolveActorFromRequest(req);
    const companyContext = await resolveCompanyContextForRequest(req, actor);
    const resourceContext = await resolvePageDerivedResourceContext(virtualPath);
    const cabinetContext = await resolveCabinetContextForResource({
      actor,
      companyContext,
      resourceContext,
    });
    const decision = await authorizeUserAction({
      actor,
      companyContext,
      resourceContext,
      cabinetContext,
      action: "read_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    const resolved = resolveContentPath(virtualPath);

    if (!(await fileExists(resolved))) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const cacheControl = ext === ".html"
      ? "no-store, max-age=0"
      : "public, max-age=3600";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");

    const actor = await resolveActorFromRequest(req);
    const companyContext = await resolveCompanyContextForRequest(req, actor);
    const resourceContext = await resolvePageDerivedResourceContext(virtualPath);
    const cabinetContext = await resolveCabinetContextForResource({
      actor,
      companyContext,
      resourceContext,
    });
    const decision = await authorizeUserAction({
      actor,
      companyContext,
      resourceContext,
      cabinetContext,
      action: "write_raw",
    });

    if (!decision.allowed) {
      return toHttpErrorResponse(decision);
    }

    const resolved = resolveContentPath(virtualPath);
    if (!isTextLikeAssetRequest(req, virtualPath)) {
      return NextResponse.json(
        { error: "This endpoint only supports text-based asset updates" },
        { status: 415 },
      );
    }

    await ensureDirectory(path.dirname(resolved));

    const body = await req.text();
    await fs.writeFile(resolved, body, "utf-8");
    autoCommit(virtualPath, "Update");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
