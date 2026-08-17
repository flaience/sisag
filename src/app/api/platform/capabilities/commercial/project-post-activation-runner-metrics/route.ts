import { NextResponse } from "next/server";

import {
  projectCommercialPostActivationRunnerMetrics,
  type CommercialPostActivationRunnerMetrics,
  type CommercialPostActivationRunnerSummary,
} from "@/modules/commercial/commercial-post-activation-runner-metrics.service";
import { validateInternalRequest } from "@/platform/core/security";

type ProjectRunnerMetricsRequest = {
  summary: CommercialPostActivationRunnerSummary;
  previous?: CommercialPostActivationRunnerMetrics;
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: ProjectRunnerMetricsRequest;
  try {
    body = (await request.json()) as ProjectRunnerMetricsRequest;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = projectCommercialPostActivationRunnerMetrics(
      body.summary,
      body.previous,
    );
    if (result.ok === false) {
      return errorResponse(
        "COMMERCIAL_INVALID_INPUT",
        result.message,
        400,
      );
    }

    return NextResponse.json({
      ok: true,
      data: result.metrics,
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION RUNNER METRICS ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível projetar as métricas do executor pós-ativação.",
      500,
    );
  }
}
