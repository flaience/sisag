import { NextResponse } from "next/server";

import {
  submitCommercialOnboardingExecutionResult,
  type SubmitCommercialOnboardingExecutionResultInput,
} from "@/modules/commercial/commercial-onboarding-execution-result.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: SubmitCommercialOnboardingExecutionResultInput;
  try {
    body = (await request.json()) as SubmitCommercialOnboardingExecutionResultInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await submitCommercialOnboardingExecutionResult(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
        command_mismatch: [409, "COMMERCIAL_ONBOARDING_COMMAND_MISMATCH"],
        executor_mismatch: [409, "COMMERCIAL_ONBOARDING_EXECUTOR_MISMATCH"],
        step_not_in_progress: [409, "COMMERCIAL_ONBOARDING_STEP_NOT_IN_PROGRESS"],
        transition_failed: [409, "COMMERCIAL_ONBOARDING_TRANSITION_FAILED"],
        result_record_failed: [500, "COMMERCIAL_ONBOARDING_RESULT_RECORD_FAILED"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({
      ok: true,
      data: {
        replayed: result.replayed,
        outcome: result.outcome,
        onboarding: result.onboarding,
        step: result.step,
      },
      emittedEvents: result.emittedEvents,
    });
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING EXECUTION RESULT ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível registrar o resultado da execução do onboarding comercial.",
      500,
    );
  }
}
