import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { CompanyUnitInputSchema } from "@/modules/units/CompanyUnit.schema";
import { createCompanyUnit, listCompanyUnits } from "@/modules/units/CompanyUnit.service";

const conflict = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "23505";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiRole(request, ["owner", "admin", "staff"]);
    if (authResult.ok === false) return authResult.response;
    const items = await listCompanyUnits(authResult.auth.companyId);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("GET current company units error:", error);
    return NextResponse.json({ ok: false, error: "internal_error", message: "Não foi possível carregar as unidades." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiRole(request, ["owner", "admin"]);
    if (authResult.ok === false) return authResult.response;
    const parsed = CompanyUnitInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_unit", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const item = await createCompanyUnit(authResult.auth.companyId, parsed.data);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    if (conflict(error)) return NextResponse.json({ ok: false, error: "unit_code_conflict", message: "Já existe uma unidade com este código." }, { status: 409 });
    console.error("POST current company unit error:", error);
    return NextResponse.json({ ok: false, error: "internal_error", message: "Não foi possível criar a unidade." }, { status: 500 });
  }
}
