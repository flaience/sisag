import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { ArrivalIntentionAdminInputSchema, ArrivalIntentionFilterSchema } from "@/modules/arrival-order/ArrivalIntention.schema";
import { ArrivalIntentionError, listArrivalIntentions, registerArrivalIntention } from "@/modules/arrival-order/ArrivalIntention.service";

function failure(error: unknown) {
  if (error instanceof ArrivalIntentionError) {
    const status = error.code === "period_capacity_exhausted" ? 409 : error.code.endsWith("not_found") ? 404 : 400;
    return NextResponse.json({ ok: false, error: error.code }, { status });
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return NextResponse.json({ ok: false, error: "arrival_intention_conflict" }, { status: 409 });
  console.error("arrival intention API error", error);
  return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiRole(request, ["owner", "admin", "staff"]);
    if (auth.ok === false) return auth.response;
    const parsed = ArrivalIntentionFilterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_arrival_intention_filter", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    return NextResponse.json({ ok: true, items: await listArrivalIntentions(auth.auth.companyId, parsed.data) });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiRole(request, ["owner", "admin"]);
    if (auth.ok === false) return auth.response;
    const parsed = ArrivalIntentionAdminInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_arrival_intention", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const item = await registerArrivalIntention(auth.auth.companyId, { periodId: parsed.data.periodId!, clientId: parsed.data.clientId!, attendanceDate: parsed.data.attendanceDate!, requestId: parsed.data.requestId!, source: "admin" });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) { return failure(error); }
}
