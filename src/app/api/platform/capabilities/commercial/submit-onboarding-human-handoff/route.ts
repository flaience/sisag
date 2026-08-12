import { NextResponse } from "next/server";

import {
  submitCommercialOnboardingHumanHandoff,
  type SubmitCommercialOnboardingHumanHandoffInput,
} from "@/modules/commercial/commercial-onboarding-human-handoff.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: SubmitCommercialOnboardingHumanHandoffInput;
  try {
    body = (await request.json()) as SubmitCommercialOnboardingHumanHandoffInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await submitCommercialOnboardingHumanHandoff(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
        handoff_not_available: [409, "COMMERCIAL_ONBOARDING_HANDOFF_NOT_AVAILABLE"],
        transition_failed: [409, "COMMERCIAL_ONBOARDING_TRANSITION_FAILED"],
        query_failed: [500, "COMMERCIAL_ONBOARDING_QUERY_FAILED"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({
      ok: true,
      data: {
        replayed: result.replayed,
        onboardingId: result.onboardingId,
        stepCode: result.stepCode,
        nextStepCode: result.nextStepCode,
        teamSize: result.teamSize,
      },
      emittedEvents: result.emittedEvents,
    });
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING HUMAN HANDOFF ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível concluir o handoff humano do onboarding comercial.",
      500,
    );
  }
}
