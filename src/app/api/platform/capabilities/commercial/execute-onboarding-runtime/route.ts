import { NextResponse } from "next/server";

import {
  handleCommercialOnboardingRuntimeEvent,
  type CommercialOnboardingRuntimeEvent,
} from "@/modules/commercial/commercial-onboarding-runtime.handler";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number, retryable = false) {
  return NextResponse.json(
    { ok: false, error: { code, message, retryable } },
    { status },
  );
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: CommercialOnboardingRuntimeEvent;
  try {
    body = (await request.json()) as CommercialOnboardingRuntimeEvent;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await handleCommercialOnboardingRuntimeEvent(body);
    if (result.ok === false) {
      if (result.error === "invalid_event") {
        return errorResponse(
          "COMMERCIAL_ONBOARDING_INVALID_RUNTIME_EVENT",
          result.message,
          400,
        );
      }

      return errorResponse(
        "COMMERCIAL_ONBOARDING_RUNTIME_FAILED",
        result.message,
        result.retryable ? 503 : 422,
        result.retryable,
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        outboxId: result.outboxId,
        commandKey: result.commandKey,
        outcome: result.outcome,
        replayed: result.replayed,
      },
      emittedEvents: result.emittedEvents,
    });
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING RUNTIME ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível executar o runtime do onboarding comercial.",
      500,
      true,
    );
  }
}
