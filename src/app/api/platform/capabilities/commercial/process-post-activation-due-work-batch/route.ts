import { NextResponse } from "next/server";

import { processCommercialPostActivationDueWorkBatch } from "@/modules/commercial/commercial-post-activation-due-work-batch-processor.service";
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
      "Dados para processamento do lote pós-ativação inválidos.",
      400,
    );
  }

  try {
    const result = await processCommercialPostActivationDueWorkBatch(payload);
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
      }
      return errorResponse(
        "COMMERCIAL_DUE_WORK_BATCH_CLAIM_FAILED",
        "Não foi possível reivindicar o lote de trabalhos pós-ativação.",
        500,
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        workerKey: result.workerKey,
        claimed: result.claimed,
        completed: result.completed,
        deferred: result.deferred,
        failed: result.failed,
        settlementFailed: result.settlementFailed,
        items: result.items,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION DUE WORK BATCH ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível processar o lote de trabalhos pós-ativação.",
      500,
    );
  }
}
