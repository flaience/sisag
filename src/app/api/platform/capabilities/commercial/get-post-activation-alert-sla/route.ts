import { NextResponse } from "next/server";

import {
  listCommercialPostActivationAlertSla,
} from "@/modules/commercial/commercial-post-activation-alert-sla-query.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const unavailableMessage = "Não foi possível consultar o SLA dos alertas pós-ativação.";

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  try {
    const result = await listCommercialPostActivationAlertSla();
    if (result.ok === false) {
      return errorResponse(
        "COMMERCIAL_INVALID_ALERT_SLA_DATA",
        "Os dados persistidos de SLA dos alertas estão inválidos.",
        500,
      );
    }

    return NextResponse.json({
      ok: true,
      data: result.data,
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION ALERT SLA QUERY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      unavailableMessage,
      500,
    );
  }
}
