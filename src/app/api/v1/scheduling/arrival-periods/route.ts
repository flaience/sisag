import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { ServiceArrivalPeriodFilterSchema, ServiceArrivalPeriodInputSchema } from "@/modules/arrival-order/ServiceArrivalPeriod.schema";
import { createServiceArrivalPeriod, listServiceArrivalPeriods, ServiceArrivalPeriodError } from "@/modules/arrival-order/ServiceArrivalPeriod.service";

function conflict(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "23505"; }
function failure(error: unknown) {
  if (conflict(error)) return NextResponse.json({ ok: false, error: "arrival_period_conflict", message: "Já existe um período igual para esta unidade e serviço." }, { status: 409 });
  if (error instanceof ServiceArrivalPeriodError) return NextResponse.json({ ok: false, error: error.code }, { status: error.code.endsWith("not_found") ? 404 : 400 });
  console.error("service arrival period API error", error);
  return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiRole(request, ["owner", "admin", "staff"]);
    if (auth.ok === false) return auth.response;
    const parsed = ServiceArrivalPeriodFilterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_filter", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ ok: true, items: await listServiceArrivalPeriods(auth.auth.companyId, parsed.data) });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiRole(request, ["owner", "admin"]);
    if (auth.ok === false) return auth.response;
    const parsed = ServiceArrivalPeriodInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_arrival_period", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ ok: true, item: await createServiceArrivalPeriod(auth.auth.companyId, parsed.data) }, { status: 201 });
  } catch (error) { return failure(error); }
}
