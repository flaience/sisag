import { NextResponse } from "next/server";

import {
  processCommercialPostActivationMilestone,
  type ProcessCommercialPostActivationMilestoneInput,
} from "@/modules/commercial/commercial-post-activation-milestone-processing.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: ProcessCommercialPostActivationMilestoneInput;
  try {
    body = (await request.json()) as ProcessCommercialPostActivationMilestoneInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await processCommercialPostActivationMilestone(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
        follow_up_not_scheduled: [409, "COMMERCIAL_POST_ACTIVATION_NOT_SCHEDULED"],
        invalid_follow_up_state: [409, "COMMERCIAL_POST_ACTIVATION_INVALID_STATE"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({
      ok: true,
      data: {
        replayed: result.replayed,
        decision: result.decision,
        onboardingId: result.onboardingId,
        milestoneCode: result.milestoneCode,
        missingIndicators: result.missingIndicators,
        activeEscalations: result.activeEscalations,
      },
      emittedEvents: result.emittedEvents,
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION MILESTONE ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível processar o marco pós-ativação.",
      500,
    );
  }
}
