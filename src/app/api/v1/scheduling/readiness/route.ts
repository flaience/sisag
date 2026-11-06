import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { SchedulingReadinessQuerySchema } from "@/modules/scheduling-readiness/SchedulingReadinessQuery.schema";
import { getSchedulingReadiness } from "@/modules/scheduling-readiness/SchedulingReadinessReadModel.service";

export async function GET(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner", "admin"]);
  if (auth.ok === false) return auth.response;
  const parsed = SchedulingReadinessQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_readiness_query", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { unitId, serviceId, professionalId } = parsed.data;
  if (!unitId || !serviceId || !professionalId) return NextResponse.json({ ok: false, error: "invalid_readiness_query" }, { status: 400 });
  try {
    const readiness = await getSchedulingReadiness({ companyId: auth.auth.companyId, unitId, serviceId, professionalId });
    return NextResponse.json({ ok: true, readiness }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("scheduling readiness API error", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
