import { NextResponse } from "next/server";

import {
  listCommercialPostActivationMonitoring,
  type ListCommercialPostActivationMonitoringInput,
} from "@/modules/commercial/commercial-post-activation-monitoring-query.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status") ?? undefined;
  const rawLimit = url.searchParams.get("limit") ?? undefined;
  const input = {
    status: rawStatus || undefined,
    limit: rawLimit === undefined ? undefined : Number(rawLimit),
  } as ListCommercialPostActivationMonitoringInput;

  try {
    const result = await listCommercialPostActivationMonitoring(input);
    if (result.ok === false) {
      return errorResponse(
        "COMMERCIAL_INVALID_INPUT",
        result.message,
        400,
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION MONITORING QUERY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível consultar o monitoramento pós-ativação.",
      500,
    );
  }
}
