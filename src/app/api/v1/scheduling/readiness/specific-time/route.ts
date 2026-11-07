import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { SchedulingReadinessSpecificTimeQuerySchema } from "@/modules/scheduling-readiness/SchedulingReadinessSpecificTimeQuery.schema";
import { getSchedulingReadinessSpecificTime } from "@/modules/scheduling-readiness/SchedulingReadinessSpecificTimeReadModel.service";

export async function GET(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner", "admin"]);
  if (auth.ok === false) return auth.response;
  const parsed = SchedulingReadinessSpecificTimeQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_specific_time_query", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { unitId, serviceId, professionalId, date, time } = parsed.data;
  try {
    const diagnosis = await getSchedulingReadinessSpecificTime({ companyId: auth.auth.companyId, unitId, serviceId, professionalId, date, time });
    return NextResponse.json({ ok: true, diagnosis }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("scheduling readiness specific time API error", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
