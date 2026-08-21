import { NextResponse } from "next/server";

import {
  listCommercialPostActivationAlertSlaSignals,
  type ListCommercialPostActivationAlertSlaSignalsInput,
} from "@/modules/commercial/commercial-post-activation-alert-sla-signal-query.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit") ?? undefined;
  const input = {
    severity: url.searchParams.get("severity") || undefined,
    type: url.searchParams.get("type") || undefined,
    limit: rawLimit === undefined ? undefined : Number(rawLimit),
  } as ListCommercialPostActivationAlertSlaSignalsInput;

  try {
    const result = await listCommercialPostActivationAlertSlaSignals(input);
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
      }
      if (result.error === "invalid_sla_data") {
        return errorResponse(
          "COMMERCIAL_INVALID_ALERT_SLA_DATA",
          "Os dados persistidos de SLA dos alertas estão inválidos.",
          500,
        );
      }
      return errorResponse(
        "COMMERCIAL_INVALID_ALERT_SLA_SIGNAL_DATA",
        "Os sinais de SLA dos alertas estão inválidos.",
        500,
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION ALERT SLA SIGNAL QUERY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível consultar os sinais de SLA dos alertas pós-ativação.",
      500,
    );
  }
}
