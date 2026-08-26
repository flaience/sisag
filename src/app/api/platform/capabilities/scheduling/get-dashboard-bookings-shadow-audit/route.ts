import { NextResponse } from "next/server";
import { z } from "zod";

import { DashboardBookingsShadowAuditService } from "@/modules/dashboard/Dashboard.bookings-shadow-audit";
import { validateInternalRequest } from "@/platform/core/security";

const querySchema = z.object({
  companyId: z.string().uuid(),
});

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    companyId: url.searchParams.get("companyId"),
  });

  if (!parsed.success) {
    return errorResponse(
      "SCHEDULING_INVALID_INPUT",
      "A empresa informada para auditoria é inválida.",
      400,
    );
  }

  try {
    const data = await DashboardBookingsShadowAuditService.observe(
      parsed.data.companyId,
    );
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("SCHEDULING DASHBOARD BOOKINGS SHADOW AUDIT ERROR:", error);
    return errorResponse(
      "SCHEDULING_SHADOW_AUDIT_FAILED",
      "Não foi possível comparar as fontes do dashboard.",
      500,
    );
  }
}
