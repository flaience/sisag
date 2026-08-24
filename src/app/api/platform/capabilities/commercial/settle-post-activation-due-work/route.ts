import { NextResponse } from "next/server";

import { settleCommercialPostActivationDueWork } from "@/modules/commercial/commercial-post-activation-due-work-settlement.service";
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
      "Dados para encerramento do trabalho pós-ativação inválidos.",
      400,
    );
  }

  try {
    const result = await settleCommercialPostActivationDueWork(payload);
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
      }
      if (result.error === "work_not_found") {
        return errorResponse(
          "COMMERCIAL_DUE_WORK_NOT_FOUND",
          "Trabalho pós-ativação não encontrado.",
          404,
        );
      }
      const conflictCode = {
        work_not_processing: "COMMERCIAL_DUE_WORK_NOT_PROCESSING",
        claim_not_owned: "COMMERCIAL_DUE_WORK_CLAIM_NOT_OWNED",
        claim_expired: "COMMERCIAL_DUE_WORK_CLAIM_EXPIRED",
      }[result.error];
      return errorResponse(
        conflictCode,
        "A reivindicação do trabalho pós-ativação não pode ser encerrada.",
        409,
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        workId: result.workId,
        outcome: result.outcome,
        attempts: result.attempts,
        retryable: result.retryable,
        nextRetryAt: result.nextRetryAt,
        ...(result.nextAvailableAt ? { nextAvailableAt: result.nextAvailableAt } : {}),
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION DUE WORK SETTLEMENT ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível encerrar o trabalho pós-ativação.",
      500,
    );
  }
}
