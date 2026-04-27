import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/admin-guards";
import { updateCompany } from "@/lib/storage/company-io";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const access = await requirePlatformAdmin(req);
  if (!access.ok) return access.response;

  const { companyId } = await context.params;
  const body = await req.json();
  try {
    const company = await updateCompany(companyId, {
      name: typeof body.name === "string" ? body.name : undefined,
      status: body.status === "disabled" ? "disabled" : body.status === "active" ? "active" : undefined,
      refreshJoinCode: body.refreshJoinCode === true,
    });
    return NextResponse.json({ ok: true, company });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
