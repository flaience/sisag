import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { QuickClientInputSchema } from "@/modules/clients/QuickClient.schema";
import { resolveQuickClient } from "@/modules/clients/QuickClient.service";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiRole(request, ["owner", "admin", "staff"]);
    if (auth.ok === false) return auth.response;
    const parsed = QuickClientInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_quick_client", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const result = await resolveQuickClient(auth.auth.companyId, parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error("POST quick client error:", error);
    return NextResponse.json({ ok: false, error: "internal_error", message: "Não foi possível identificar ou criar o cliente." }, { status: 500 });
  }
}
export const runtime = "nodejs";
