import { NextResponse } from "next/server";

import {
  persistCommercialPostActivationRunnerMetrics,
  type PersistCommercialPostActivationRunnerMetricsInput,
} from "@/modules/commercial/commercial-post-activation-runner-metrics-persistence.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: PersistCommercialPostActivationRunnerMetricsInput;
  try {
    body = (await request.json()) as PersistCommercialPostActivationRunnerMetricsInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await persistCommercialPostActivationRunnerMetrics(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        persistence_conflict: [409, "COMMERCIAL_RUNNER_METRICS_CONFLICT"],
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
        metrics: result.metrics,
      },
    });
  } catch (error) {
    console.error(
      "COMMERCIAL POST-ACTIVATION RUNNER METRICS PERSISTENCE ERROR:",
      error,
    );
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível persistir as métricas do executor pós-ativação.",
      500,
    );
  }
}
