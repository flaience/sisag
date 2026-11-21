import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { ServiceArrivalPeriodInputSchema } from "@/modules/arrival-order/ServiceArrivalPeriod.schema";
import { deactivateServiceArrivalPeriod, ServiceArrivalPeriodError, updateServiceArrivalPeriod } from "@/modules/arrival-order/ServiceArrivalPeriod.service";

type Context = { params: Promise<{ id: string }> };
const Id = z.string().uuid();
function conflict(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "23505"; }
function failure(error: unknown) {
  if (conflict(error)) return NextResponse.json({ ok: false, error: "arrival_period_conflict", message: "Já existe um período igual para esta unidade e serviço." }, { status: 409 });
  if (error instanceof ServiceArrivalPeriodError) return NextResponse.json({ ok: false, error: error.code }, { status: error.code === "arrival_period_not_found" ? 404 : 400 });
  console.error("service arrival period item API error", error);
  return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
}
async function parseId(context: Context) { return Id.safeParse((await context.params).id); }

export async function PUT(request: NextRequest, context: Context) {
  try {
    const auth = await requireApiRole(request, ["owner", "admin"]);
    if (auth.ok === false) return auth.response;
    const id = await parseId(context);
    if (!id.success) return NextResponse.json({ ok: false, error: "invalid_arrival_period_id" }, { status: 400 });
    const parsed = ServiceArrivalPeriodInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_arrival_period", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ ok: true, item: await updateServiceArrivalPeriod(auth.auth.companyId, id.data, parsed.data) });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const auth = await requireApiRole(request, ["owner", "admin"]);
    if (auth.ok === false) return auth.response;
    const id = await parseId(context);
    if (!id.success) return NextResponse.json({ ok: false, error: "invalid_arrival_period_id" }, { status: 400 });
    return NextResponse.json({ ok: true, item: await deactivateServiceArrivalPeriod(auth.auth.companyId, id.data), deactivated: true });
  } catch (error) { return failure(error); }
}
