import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { ProfessionalSchema } from "@/modules/professionals/Professional.schema";
import { createCompanyProfessional, listCompanyProfessionals } from "@/modules/professionals/Professional.tenant.service";

export async function GET(request: NextRequest) {
  try { const auth = await requireApiRole(request, ["owner", "admin", "staff"]); if (auth.ok === false) return auth.response; const search = new URL(request.url).searchParams.get("search") ?? ""; return NextResponse.json({ ok: true, items: await listCompanyProfessionals(auth.auth.companyId, search) }); }
  catch { return NextResponse.json({ ok: false, error: "internal_error", message: "Não foi possível carregar os profissionais." }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  try { const auth = await requireApiRole(request, ["owner", "admin"]); if (auth.ok === false) return auth.response; const parsed = ProfessionalSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_professional", issues: parsed.error.flatten().fieldErrors }, { status: 400 }); const item = await createCompanyProfessional(auth.auth.companyId, parsed.data); return NextResponse.json({ ok: true, item }, { status: 201 }); }
  catch { return NextResponse.json({ ok: false, error: "internal_error", message: "Não foi possível cadastrar o profissional." }, { status: 500 }); }
}
export const runtime = "nodejs";
