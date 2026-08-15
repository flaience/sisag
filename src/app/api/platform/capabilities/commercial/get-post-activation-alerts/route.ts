import { NextResponse } from "next/server";

import {
  listCommercialPostActivationAlerts,
  type ListCommercialPostActivationAlertsInput,
} from "@/modules/commercial/commercial-post-activation-alert-query.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const rawSeverity = url.searchParams.get("severity") ?? undefined;
  const rawCategory = url.searchParams.get("category") ?? undefined;
  const rawLimit = url.searchParams.get("limit") ?? undefined;
  const input = {
    severity: rawSeverity || undefined,
    category: rawCategory || undefined,
    limit: rawLimit === undefined ? undefined : Number(rawLimit),
  } as ListCommercialPostActivationAlertsInput;

  try {
    const result = await listCommercialPostActivationAlerts(input);
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
      }
      if (result.error === "monitoring_unavailable") {
        return errorResponse("COMMERCIAL_MONITORING_UNAVAILABLE", result.message, 503);
      }
      if (result.error === "invalid_action_history") {
        return errorResponse("COMMERCIAL_INVALID_ALERT_ACTION_HISTORY", result.message, 500);
      }
      return errorResponse("COMMERCIAL_INVALID_MONITORING_DATA", result.message, 500);
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION ALERT QUERY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível consultar os alertas pós-ativação.",
      500,
    );
  }
}
