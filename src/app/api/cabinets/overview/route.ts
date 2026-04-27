import { NextRequest, NextResponse } from "next/server";
import { readCabinetOverview, resolveOverviewCabinetPath } from "@/lib/cabinets/overview";
import { parseCabinetVisibilityMode } from "@/lib/cabinets/visibility";
import { canReadCabinetForRequest, requireCabinetRead } from "@/lib/auth/route-guards";
import type { CabinetOverview, CabinetReference } from "@/types/cabinets";

async function filterReadableCabinetReferences(
  request: NextRequest,
  references: CabinetReference[],
): Promise<CabinetReference[]> {
  const filtered: CabinetReference[] = [];
  for (const reference of references) {
    if (await canReadCabinetForRequest(request, resolveOverviewCabinetPath(reference.path)).catch(() => false)) {
      filtered.push(reference);
    }
  }
  return filtered;
}

async function filterReadableOverview(
  request: NextRequest,
  overview: CabinetOverview,
): Promise<CabinetOverview> {
  const readableCabinets = await filterReadableCabinetReferences(request, overview.visibleCabinets);
  const readablePaths = new Set(readableCabinets.map((cabinet) => cabinet.path));
  const parentIsReadable = overview.parent
    ? await canReadCabinetForRequest(request, resolveOverviewCabinetPath(overview.parent.path)).catch(() => false)
    : false;
  return {
    ...overview,
    parent: parentIsReadable ? overview.parent : null,
    children: (await filterReadableCabinetReferences(request, overview.children))
      .filter((cabinet) => readablePaths.has(cabinet.path)),
    visibleCabinets: readableCabinets,
    agents: overview.agents.filter((agent) => readablePaths.has(agent.cabinetPath)),
    jobs: overview.jobs.filter((job) => readablePaths.has(job.cabinetPath)),
  };
}

export async function GET(request: NextRequest) {
  const cabinetPath = request.nextUrl.searchParams.get("path");
  const visibilityMode = parseCabinetVisibilityMode(
    request.nextUrl.searchParams.get("visibility")
  );

  if (!cabinetPath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  try {
    const forbidden = await requireCabinetRead(request, resolveOverviewCabinetPath(cabinetPath));
    if (forbidden) return forbidden;

    const overview = await readCabinetOverview(cabinetPath, { visibilityMode });
    return NextResponse.json(await filterReadableOverview(request, overview));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
