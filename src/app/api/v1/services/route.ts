import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { listServicesForCompany } from "@/modules/services/Services.query";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireApiRole(req, ["owner", "admin", "staff"]);
    if (authResult.ok === false) return authResult.response;

    const search = new URL(req.url).searchParams.get("search") ?? "";
    const items = await listServicesForCompany({
      companyId: authResult.auth.companyId,
      search,
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("GET /api/v1/services error:", error);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: "Não foi possível carregar os serviços." },
      { status: 500 },
    );
  }
}
