import { NextResponse } from "next/server";

import {
  recordCommercialPostActivationObservation,
  type RecordCommercialPostActivationObservationInput,
} from "@/modules/commercial/commercial-post-activation-observations.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: RecordCommercialPostActivationObservationInput;
  try {
    body = (await request.json()) as RecordCommercialPostActivationObservationInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await recordCommercialPostActivationObservation(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
        post_activation_not_available: [409, "COMMERCIAL_POST_ACTIVATION_NOT_AVAILABLE"],
        milestone_not_found: [404, "COMMERCIAL_POST_ACTIVATION_MILESTONE_NOT_FOUND"],
        observation_conflict: [409, "COMMERCIAL_POST_ACTIVATION_OBSERVATION_CONFLICT"],
        invalid_observation_history: [409, "COMMERCIAL_POST_ACTIVATION_INVALID_OBSERVATION_HISTORY"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({
      ok: true,
      data: {
        replayed: result.replayed,
        onboardingId: result.onboardingId,
        milestoneCode: result.milestoneCode,
        indicator: result.indicator,
        observationCount: result.observationCount,
      },
    }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION OBSERVATION ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível registrar a observação pós-ativação.",
      500,
    );
  }
}
