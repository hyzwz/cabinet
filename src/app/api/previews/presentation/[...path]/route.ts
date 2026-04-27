import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { parsePptxPreview } from "@/lib/previews/pptx";
import { convertPptxToPdf } from "@/lib/previews/pptx-pdf";
import { resolveContentPath } from "@/lib/storage/path-utils";
import { fileExists } from "@/lib/storage/fs-operations";
import {
  authorizeUserAction,
  resolveActorFromRequest,
  resolveCabinetContextForResource,
  resolveCompanyContextForRequest,
  resolvePageDerivedResourceContext,
  toHttpErrorResponse,
} from "@/lib/auth/page-authorization";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");
    const ext = path.extname(virtualPath).toLowerCase();

    if (ext !== ".pptx") {
      return NextResponse.json(
        { error: "Cabinet can preview .pptx files. Legacy .ppt files can still be opened or downloaded." },
        { status: 415 }
      );
    }

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

    if (req.nextUrl.searchParams.get("format") === "pdf") {
      const pdf = await convertPptxToPdf(resolved);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Content-Disposition": "inline; filename=\"presentation-preview.pdf\"",
          "Content-Type": "application/pdf",
        },
      });
    }

    const buffer = await fs.readFile(resolved);
    const preview = await parsePptxPreview(buffer);

    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
