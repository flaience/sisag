import { NextResponse } from "next/server";

import { executeCommercialPostActivationDueWork } from "@/modules/commercial/commercial-post-activation-due-work-unit-executor.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_INPUT",
      "Dados para execução do trabalho pós-ativação inválidos.",
      400,
    );
  }

  try {
    const result = await executeCommercialPostActivationDueWork(payload);
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
      }
      if (result.error === "onboarding_not_found") {
        return errorResponse(
          "COMMERCIAL_DUE_WORK_ONBOARDING_NOT_FOUND",
          "O onboarding do trabalho pós-ativação não foi encontrado.",
          404,
        );
      }
      const code = result.error === "invalid_follow_up_state"
        ? "COMMERCIAL_DUE_WORK_INVALID_FOLLOW_UP_STATE"
        : "COMMERCIAL_DUE_WORK_EXECUTION_REJECTED";
      return errorResponse(
        code,
        "O trabalho pós-ativação não pode ser executado no estado atual.",
        409,
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        workId: result.workId,
        workerKey: result.workerKey,
        onboardingId: result.onboardingId,
        milestoneCode: result.milestoneCode,
        decision: result.decision,
        settlementOutcome: result.settlementOutcome,
        deferSeconds: result.deferSeconds,
        replayed: result.replayed,
        missingIndicators: result.missingIndicators,
        activeEscalations: result.activeEscalations,
        emittedEvents: result.emittedEvents,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION DUE WORK EXECUTION ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível executar o trabalho pós-ativação.",
      500,
    );
  }
}
