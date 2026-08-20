import { NextResponse } from "next/server";

import {
  synchronizeCommercialPostActivationAlertOccurrenceRegistry,
} from "@/modules/commercial/commercial-post-activation-alert-occurrence-sync.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}
const unavailableMessage = "Não foi possível sincronizar as ocorrências dos alertas pós-ativação.";

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  try {
    const result = await synchronizeCommercialPostActivationAlertOccurrenceRegistry();
    if (result.ok === false) {
      return errorResponse(
        "COMMERCIAL_ALERT_OCCURRENCE_SYNC_UNAVAILABLE",
        unavailableMessage,
        503,
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        activeAlerts: result.activeAlerts,
        resolvedActions: result.resolvedActions,
        observed: result.observed,
        resolved: result.resolved,
        replayedResolutions: result.replayedResolutions,
        reconciledResolutions: result.reconciledResolutions,
        missingOccurrences: result.missingOccurrences,
        invalidRecords: result.invalidRecords,
        historyTruncated: result.historyTruncated,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION ALERT OCCURRENCE SYNC ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      unavailableMessage,
      500,
    );
  }
}
