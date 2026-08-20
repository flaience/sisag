import { NextResponse } from "next/server";

import {
  listCommercialPostActivationAlertSla,
  type ListCommercialPostActivationAlertSlaInput,
} from "@/modules/commercial/commercial-post-activation-alert-sla-query.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const unavailableMessage = "Não foi possível consultar o SLA dos alertas pós-ativação.";

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const rawSeverity = url.searchParams.get("severity") ?? undefined;
  const rawLifecycle = url.searchParams.get("lifecycle") ?? undefined;
  const rawBreach = url.searchParams.get("breach") ?? undefined;
  const rawLimit = url.searchParams.get("limit") ?? undefined;
  const rawOffset = url.searchParams.get("offset") ?? undefined;
  const input = {
    severity: rawSeverity || undefined,
    lifecycle: rawLifecycle || undefined,
    breach: rawBreach || undefined,
    limit: rawLimit === undefined ? undefined : Number(rawLimit),
    offset: rawOffset === undefined ? undefined : Number(rawOffset),
  } as ListCommercialPostActivationAlertSlaInput;

  try {
    const result = await listCommercialPostActivationAlertSla(input);
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse(
          "COMMERCIAL_INVALID_INPUT",
          result.message,
          400,
        );
      }
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
