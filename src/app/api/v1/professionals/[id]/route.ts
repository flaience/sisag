import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { ProfessionalSchema } from "@/modules/professionals/Professional.schema";
import { deactivateCompanyProfessional, getCompanyProfessional, updateCompanyProfessional } from "@/modules/professionals/Professional.tenant.service";
const IdSchema = z.string().uuid();
const notFound = () => NextResponse.json({ ok: false, error: "professional_not_found", message: "Profissional não encontrado." }, { status: 404 });
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const auth = await requireApiRole(request, ["owner", "admin", "staff"]); if (auth.ok === false) return auth.response; const parsedId = IdSchema.safeParse((await context.params).id); if (!parsedId.success) return notFound(); const item = await getCompanyProfessional(auth.auth.companyId, parsedId.data); return item ? NextResponse.json(item) : notFound(); }
  catch { return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 }); }
}
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const auth = await requireApiRole(request, ["owner", "admin"]); if (auth.ok === false) return auth.response; const parsedId = IdSchema.safeParse((await context.params).id); if (!parsedId.success) return notFound(); const parsed = ProfessionalSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_professional", issues: parsed.error.flatten().fieldErrors }, { status: 400 }); const item = await updateCompanyProfessional(auth.auth.companyId, parsedId.data, parsed.data); return item ? NextResponse.json(item) : notFound(); }
  catch { return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 }); }
}
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const auth = await requireApiRole(request, ["owner", "admin"]); if (auth.ok === false) return auth.response; const parsedId = IdSchema.safeParse((await context.params).id); if (!parsedId.success) return notFound(); const item = await deactivateCompanyProfessional(auth.auth.companyId, parsedId.data); return item ? NextResponse.json({ ok: true, item, deactivated: true }) : notFound(); }
  catch { return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 }); }
}
