import { NextResponse } from "next/server";

import {
  dispatchCommercialOnboarding,
  type DispatchCommercialOnboardingInput,
} from "@/modules/commercial/commercial-onboarding-dispatch.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: DispatchCommercialOnboardingInput;
  try {
    body = (await request.json()) as DispatchCommercialOnboardingInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await dispatchCommercialOnboarding(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
        planning_failed: [409, "COMMERCIAL_ONBOARDING_PLANNING_FAILED"],
        transition_failed: [409, "COMMERCIAL_ONBOARDING_TRANSITION_FAILED"],
        dispatch_failed: [500, "COMMERCIAL_ONBOARDING_DISPATCH_FAILED"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          dispatched: result.dispatched,
          replayed: result.replayed,
          decision: result.decision,
          reason: result.reason,
          command: result.command,
          transition: result.transition,
        },
        emittedEvents: result.emittedEvents,
      },
      { status: result.dispatched ? 202 : 200 },
    );
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING DISPATCH ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível despachar a execução do onboarding comercial.",
      500,
    );
  }
}
