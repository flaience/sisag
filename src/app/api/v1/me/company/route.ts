export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentCompany } from "@/modules/dashboard/getCurrentCompany";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "unauthorized",
          message: "Usuário não autenticado.",
        },
        { status: 401 },
      );
    }

    const company = await getCurrentCompany();

    if (!company) {
      return NextResponse.json(
        {
          ok: false,
          error: "company_not_found",
          message: "Usuário sem empresa vinculada.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: company,
    });
  } catch (error: any) {
    console.error("GET /api/v1/me/company error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: error?.message ?? "Erro ao carregar empresa do usuário.",
      },
      { status: 500 },
    );
  }
}
