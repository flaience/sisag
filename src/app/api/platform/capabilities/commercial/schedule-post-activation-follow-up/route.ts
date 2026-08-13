import { NextResponse } from "next/server";

import {
  scheduleCommercialPostActivation,
  type ScheduleCommercialPostActivationInput,
} from "@/modules/commercial/commercial-post-activation-scheduling.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: ScheduleCommercialPostActivationInput;
  try {
    body = (await request.json()) as ScheduleCommercialPostActivationInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await scheduleCommercialPostActivation(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
        activation_not_available: [409, "COMMERCIAL_POST_ACTIVATION_NOT_AVAILABLE"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({
      ok: true,
      data: {
        replayed: result.replayed,
        onboardingId: result.onboardingId,
        planKey: result.planKey,
        supportWindowEndsAt: result.supportWindowEndsAt,
        milestoneCount: result.milestoneCount,
      },
      emittedEvents: result.emittedEvents,
    }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION SCHEDULING ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível agendar o acompanhamento pós-ativação.",
      500,
    );
  }
}
