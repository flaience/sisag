import { NextResponse } from "next/server";

import {
  transitionCommercialOnboardingStep,
  type TransitionCommercialOnboardingStepInput,
} from "@/modules/commercial/commercial-onboarding-workflow.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;
  let body: TransitionCommercialOnboardingStepInput;
  try {
    body = (await request.json()) as TransitionCommercialOnboardingStepInput;
  } catch {
    return errorResponse("COMMERCIAL_INVALID_JSON", "O corpo da requisição deve conter um JSON válido.", 400);
  }
  try {
    const result = await transitionCommercialOnboardingStep(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
        step_not_found: [404, "COMMERCIAL_ONBOARDING_STEP_NOT_FOUND"],
        onboarding_terminal: [409, "COMMERCIAL_ONBOARDING_TERMINAL"],
        step_out_of_order: [409, "COMMERCIAL_ONBOARDING_STEP_OUT_OF_ORDER"],
        transition_not_allowed: [409, "COMMERCIAL_ONBOARDING_TRANSITION_NOT_ALLOWED"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }
    return NextResponse.json({ ok: true, data: { replayed: result.replayed, onboarding: result.onboarding, step: result.step }, emittedEvents: result.emittedEvents });
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING TRANSITION ERROR:", error);
    return errorResponse("COMMERCIAL_UNKNOWN_ERROR", "Não foi possível alterar a etapa do onboarding comercial.", 500);
  }
}
