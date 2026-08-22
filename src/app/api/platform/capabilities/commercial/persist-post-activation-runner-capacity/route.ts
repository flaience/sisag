import { NextResponse } from "next/server";

import { persistCommercialPostActivationRunnerCapacity } from "@/modules/commercial/commercial-post-activation-runner-capacity-persistence.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const invalidMessage = "Dados para persistência da capacidade do runner inválidos.";
const unavailableMessage = "Não foi possível persistir a capacidade do executor pós-ativação.";

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
    const result = await persistCommercialPostActivationRunnerCapacity(payload);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        execution_not_found: [404, "COMMERCIAL_RUNNER_EXECUTION_NOT_FOUND"],
        invalid_stored_capacity: [409, "COMMERCIAL_RUNNER_CAPACITY_INVALID"],
        persistence_conflict: [409, "COMMERCIAL_RUNNER_CAPACITY_CONFLICT"],
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
        capacity: result.capacity,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION RUNNER CAPACITY PERSISTENCE ERROR:", error);
    return errorResponse("COMMERCIAL_UNKNOWN_ERROR", unavailableMessage, 500);
  }
}
