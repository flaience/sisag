import { NextResponse } from "next/server";

import {
  listCommercialPostActivationAlertHistory,
  type ListCommercialPostActivationAlertHistoryInput,
} from "@/modules/commercial/commercial-post-activation-alert-history.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const rawCursor = url.searchParams.get("cursor") ?? undefined;
  const rawAction = url.searchParams.get("action") ?? undefined;
  const rawActorType = url.searchParams.get("actorType") ?? undefined;
  const rawLimit = url.searchParams.get("limit") ?? undefined;
  const input = {
    cursor: rawCursor || undefined,
    action: rawAction || undefined,
    actorType: rawActorType || undefined,
    limit: rawLimit === undefined ? undefined : Number(rawLimit),
  } as ListCommercialPostActivationAlertHistoryInput;

  try {
    const result = await listCommercialPostActivationAlertHistory(input);
    if (result.ok === false) {
      return errorResponse(
        "COMMERCIAL_INVALID_INPUT",
        result.message,
        400,
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION ALERT HISTORY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível consultar o histórico dos alertas pós-ativação.",
      500,
    );
  }
}
