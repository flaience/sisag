import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { deactivateProfessionalUnit, ProfessionalUnitError } from "@/modules/professionals/ProfessionalUnit.service";
const Id = z.string().uuid();
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; unitId: string }> }) { try { const auth = await requireApiRole(request, ["owner", "admin"]); if (auth.ok === false) return auth.response; const params = await context.params; const id = Id.safeParse(params.id); const unitId = Id.safeParse(params.unitId); if (!id.success || !unitId.success) return NextResponse.json({ ok: false, error: "link_not_found" }, { status: 404 }); return NextResponse.json({ ok: true, item: await deactivateProfessionalUnit(auth.auth.companyId, id.data, unitId.data) }); } catch (error) { return error instanceof ProfessionalUnitError ? NextResponse.json({ ok: false, error: error.code }, { status: 404 }) : NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 }); } }
