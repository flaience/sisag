import { NextResponse } from "next/server";

import { queryCommercialPostActivationProjectionAudit } from "@/modules/commercial/commercial-post-activation-due-work-projection-audit-query.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const input = {
    ...(url.searchParams.has("limit")
      ? { limit: Number(url.searchParams.get("limit")) }
      : {}),
  };

  try {
    const result = await queryCommercialPostActivationProjectionAudit(input);
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse(
          "COMMERCIAL_INVALID_INPUT",
          "Parâmetros para auditoria da projeção pós-ativação inválidos.",
          400,
        );
      }
      return errorResponse(
        "COMMERCIAL_INVALID_PROJECTION_AUDIT_HISTORY",
        "O histórico da auditoria de projeção pós-ativação está inválido.",
        500,
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION PROJECTION AUDIT QUERY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível consultar a auditoria de projeção pós-ativação.",
      500,
    );
  }
}
