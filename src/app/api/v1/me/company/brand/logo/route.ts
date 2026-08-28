import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { CompanyLogoError, getCompanyLogo, removeCompanyLogo, uploadCompanyLogo } from "@/modules/companies/CompanyLogo.service";
const errorResponse = (error: unknown) => {
  if (error instanceof CompanyLogoError && error.code === "invalid_logo") return NextResponse.json({ ok: false, error: error.code, message: "Envie uma imagem PNG, JPEG ou WebP de até 2 MB." }, { status: 400 });
  if (error instanceof CompanyLogoError && error.code === "company_not_found") return NextResponse.json({ ok: false, error: error.code, message: "Empresa não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: false, error: "internal_error", message: "Não foi possível processar o logotipo." }, { status: 500 });
};
export async function GET(request: NextRequest) {
  try { const auth = await requireApiRole(request, ["owner", "admin", "staff"]); if (auth.ok === false) return auth.response; return NextResponse.json({ ok: true, ...(await getCompanyLogo(auth.auth.companyId)) }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: NextRequest) {
  try { const auth = await requireApiRole(request, ["owner", "admin"]); if (auth.ok === false) return auth.response; const file = (await request.formData()).get("file"); if (!(file instanceof File)) throw new CompanyLogoError("invalid_logo"); const bytes = new Uint8Array(await file.arrayBuffer()); const result = await uploadCompanyLogo(auth.auth.companyId, { bytes, contentType: file.type }); return NextResponse.json({ ok: true, ...result }, { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
export async function DELETE(request: NextRequest) {
  try { const auth = await requireApiRole(request, ["owner", "admin"]); if (auth.ok === false) return auth.response; return NextResponse.json({ ok: true, ...(await removeCompanyLogo(auth.auth.companyId)) }); }
  catch (error) { return errorResponse(error); }
}
