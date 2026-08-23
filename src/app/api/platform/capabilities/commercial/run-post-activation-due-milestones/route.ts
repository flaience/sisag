import { NextResponse } from "next/server";

import {
  runCommercialPostActivationDueMilestones,
  type RunCommercialPostActivationDueMilestonesInput,
} from "@/modules/commercial/commercial-post-activation-due-runner.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}
export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: RunCommercialPostActivationDueMilestonesInput;
  try {
    const text = await request.text();
    body = text.trim() ? JSON.parse(text) as RunCommercialPostActivationDueMilestonesInput : {};
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await runCommercialPostActivationDueMilestones(body);
    if (result.ok === false) {
      return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
    }

    return NextResponse.json({
      ok: true,
      data: {
        scanned: result.scanned,
        cursor: result.cursor,
        wrapped: result.wrapped,
        due: result.due,
        processed: result.processed,
        waiting: result.waiting,
        completed: result.completed,
        escalated: result.escalated,
        plansCompleted: result.plansCompleted,
        failed: result.failed,
        failures: result.failures,
        dueWork: result.dueWork,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION DUE RUNNER ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível processar os marcos pós-ativação vencidos.",
      500,
    );
  }
}
