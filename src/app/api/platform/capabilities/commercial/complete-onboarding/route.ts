import { NextResponse } from "next/server";

import {
  completeCommercialOnboarding,
  type CompleteCommercialOnboardingInput,
} from "@/modules/commercial/commercial-onboarding-completion.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: CompleteCommercialOnboardingInput;
  try {
    body = (await request.json()) as CompleteCommercialOnboardingInput;
  } catch {
    return errorResponse("COMMERCIAL_INVALID_JSON", "O corpo da requisição deve conter um JSON válido.", 400);
  }

  try {
    const result = await completeCommercialOnboarding(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
        completion_not_available: [409, "COMMERCIAL_ONBOARDING_COMPLETION_NOT_AVAILABLE"],
        completion_requirements_not_met: [409, "COMMERCIAL_ONBOARDING_COMPLETION_REQUIREMENTS_NOT_MET"],
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
        status: result.status,
        clientStatus: result.clientStatus,
      },
      emittedEvents: result.emittedEvents,
    });
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING COMPLETION ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível concluir o onboarding comercial.",
      500,
    );
  }
}

