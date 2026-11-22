import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { ArrivalIntentionError, cancelArrivalIntention } from "@/modules/arrival-order/ArrivalIntention.service";

type Context = { params: Promise<{ id: string }> };
const Id = z.string().uuid();

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const auth = await requireApiRole(request, ["owner", "admin"]);
    if (auth.ok === false) return auth.response;
    const id = Id.safeParse((await context.params).id);
    if (!id.success) return NextResponse.json({ ok: false, error: "invalid_arrival_intention_id" }, { status: 400 });
    return NextResponse.json({ ok: true, item: await cancelArrivalIntention(auth.auth.companyId, id.data), cancelled: true });
  } catch (error) {
    if (error instanceof ArrivalIntentionError) return NextResponse.json({ ok: false, error: error.code }, { status: error.code === "arrival_intention_not_found" ? 404 : 400 });
    console.error("arrival intention cancellation API error", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
