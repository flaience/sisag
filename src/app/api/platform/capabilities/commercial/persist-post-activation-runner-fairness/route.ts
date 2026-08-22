import { NextResponse } from "next/server";

import { persistCommercialPostActivationRunnerFairness } from "@/modules/commercial/commercial-post-activation-runner-fairness-persistence.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const invalidMessage = "Dados para persistência da justiça do runner inválidos.";
const unavailableMessage = "Não foi possível persistir a justiça do executor pós-ativação.";

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
    const result = await persistCommercialPostActivationRunnerFairness(payload);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        execution_not_found: [404, "COMMERCIAL_RUNNER_EXECUTION_NOT_FOUND"],
        invalid_stored_fairness: [409, "COMMERCIAL_RUNNER_FAIRNESS_INVALID"],
        persistence_conflict: [409, "COMMERCIAL_RUNNER_FAIRNESS_CONFLICT"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({
      ok: true,
      data: {
        replayed: result.replayed,
        runnerKey: result.runnerKey,
        executionKey: result.executionKey,
        fairness: result.fairness,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION RUNNER FAIRNESS PERSISTENCE ERROR:", error);
    return errorResponse("COMMERCIAL_UNKNOWN_ERROR", unavailableMessage, 500);
  }
}
