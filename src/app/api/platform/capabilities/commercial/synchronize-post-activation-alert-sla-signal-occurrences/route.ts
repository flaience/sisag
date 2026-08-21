import { NextResponse } from "next/server";

import { synchronizeCommercialPostActivationAlertSlaSignalOccurrences } from "@/modules/commercial/commercial-post-activation-alert-sla-signal-occurrences.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const invalidMessage = "Dados das ocorrências dos sinais de SLA inválidos.";
const unavailableMessage = "Não foi possível sincronizar as ocorrências dos sinais de SLA.";

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("COMMERCIAL_INVALID_INPUT", invalidMessage, 400);
  }

  try {
    const result = await synchronizeCommercialPostActivationAlertSlaSignalOccurrences(payload);
    if (result.ok === false) {
      return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
    }
    return NextResponse.json({
      ok: true,
      data: {
        created: result.created,
        observed: result.observed,
        resolved: result.resolved,
        active: result.active,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION ALERT SLA SIGNAL OCCURRENCE SYNC ERROR:", error);
    return errorResponse("COMMERCIAL_UNKNOWN_ERROR", unavailableMessage, 500);
  }
}
