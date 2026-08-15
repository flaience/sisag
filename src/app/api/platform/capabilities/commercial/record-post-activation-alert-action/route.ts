import { NextResponse } from "next/server";

import {
  recordCommercialPostActivationAlertAction,
  type RecordCommercialPostActivationAlertActionInput,
} from "@/modules/commercial/commercial-post-activation-alert-action.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: RecordCommercialPostActivationAlertActionInput;
  try {
    body = (await request.json()) as RecordCommercialPostActivationAlertActionInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await recordCommercialPostActivationAlertAction(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
        post_activation_not_available: [409, "COMMERCIAL_POST_ACTIVATION_NOT_AVAILABLE"],
        alert_not_active: [409, "COMMERCIAL_POST_ACTIVATION_ALERT_NOT_ACTIVE"],
        action_conflict: [409, "COMMERCIAL_POST_ACTIVATION_ALERT_ACTION_CONFLICT"],
        invalid_action_history: [409, "COMMERCIAL_POST_ACTIVATION_INVALID_ALERT_ACTION_HISTORY"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({
      ok: true,
      data: {
        replayed: result.replayed,
        onboardingId: result.onboardingId,
        alertKey: result.alertKey,
        action: result.action,
        actionCount: result.actionCount,
      },
      emittedEvents: result.emittedEvents,
    }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION ALERT ACTION ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível registrar a ação sobre o alerta pós-ativação.",
      500,
    );
  }
}
