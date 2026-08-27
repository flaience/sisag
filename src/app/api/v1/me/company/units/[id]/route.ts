import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { CompanyUnitInputSchema } from "@/modules/units/CompanyUnit.schema";
import { getCompanyUnit, updateCompanyUnit } from "@/modules/units/CompanyUnit.service";

type Context = { params: Promise<{ id: string }> };
const conflict = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "23505";

export async function GET(request: NextRequest, context: Context) {
  try {
    const authResult = await requireApiRole(request, ["owner", "admin", "staff"]);
    if (authResult.ok === false) return authResult.response;
    const { id } = await context.params;
    const item = await getCompanyUnit(authResult.auth.companyId, id);
    if (!item) return NextResponse.json({ ok: false, error: "unit_not_found", message: "Unidade não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("GET current company unit error:", error);
    return NextResponse.json({ ok: false, error: "internal_error", message: "Não foi possível carregar a unidade." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const authResult = await requireApiRole(request, ["owner", "admin"]);
    if (authResult.ok === false) return authResult.response;
    const parsed = CompanyUnitInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_unit", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const { id } = await context.params;
    const item = await updateCompanyUnit(authResult.auth.companyId, id, parsed.data);
    if (!item) return NextResponse.json({ ok: false, error: "unit_not_found", message: "Unidade não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (conflict(error)) return NextResponse.json({ ok: false, error: "unit_code_conflict", message: "Já existe uma unidade com este código." }, { status: 409 });
    console.error("PUT current company unit error:", error);
    return NextResponse.json({ ok: false, error: "internal_error", message: "Não foi possível salvar a unidade." }, { status: 500 });
  }
}
