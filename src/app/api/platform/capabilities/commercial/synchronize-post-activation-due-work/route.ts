import { NextResponse } from "next/server";

import { synchronizeCommercialPostActivationDueWork } from "@/modules/commercial/commercial-post-activation-due-work-persistence.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const invalidMessage = "Dados para sincronização dos trabalhos pós-ativação inválidos.";
const inconsistentMessage = "O plano e o histórico pós-ativação são inconsistentes.";
const unavailableMessage = "Não foi possível sincronizar os trabalhos pós-ativação.";

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("COMMERCIAL_INVALID_INPUT", invalidMessage, 400);
  }

  try {
    const result = await synchronizeCommercialPostActivationDueWork(payload);
    if (result.ok === false) {
      if (result.error === "invalid_plan_state") {
        return errorResponse(
          "COMMERCIAL_INVALID_PLAN_STATE",
          inconsistentMessage,
          409,
        );
      }
      return errorResponse("COMMERCIAL_INVALID_INPUT", invalidMessage, 400);
    }

    return NextResponse.json({
      ok: true,
      data: {
        onboardingId: result.onboardingId,
        total: result.total,
        created: result.created,
        updated: result.updated,
        preserved: result.preserved,
        completed: result.completed,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION DUE WORK SYNC ERROR:", error);
    return errorResponse("COMMERCIAL_UNKNOWN_ERROR", unavailableMessage, 500);
  }
}
