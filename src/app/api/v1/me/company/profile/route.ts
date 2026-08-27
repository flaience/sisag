import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { CurrentCompanyProfileInputSchema } from "@/modules/companies/CurrentCompanyProfile.schema";
import { getCurrentCompanyProfile, updateCurrentCompanyProfile } from "@/modules/companies/CurrentCompanyProfile.service";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiRole(request, ["owner", "admin", "staff"]);
    if (authResult.ok === false) return authResult.response;
    const item = await getCurrentCompanyProfile(authResult.auth.companyId);
    if (!item) return NextResponse.json({ ok: false, error: "company_not_found", message: "Empresa não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("GET /api/v1/me/company/profile error:", error);
    return NextResponse.json({ ok: false, error: "internal_error", message: "Não foi possível carregar os dados da empresa." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiRole(request, ["owner", "admin"]);
    if (authResult.ok === false) return authResult.response;
    const parsed = CurrentCompanyProfileInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_company_profile", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const item = await updateCurrentCompanyProfile(authResult.auth.companyId, parsed.data);
    if (!item) return NextResponse.json({ ok: false, error: "company_not_found", message: "Empresa não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("PUT /api/v1/me/company/profile error:", error);
    return NextResponse.json({ ok: false, error: "internal_error", message: "Não foi possível salvar os dados da empresa." }, { status: 500 });
  }
}
