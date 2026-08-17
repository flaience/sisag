import { NextResponse } from "next/server";

import {
  getCommercialPostActivationRunnerMetrics,
} from "@/modules/commercial/commercial-post-activation-runner-metrics-query.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}
export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const runnerKey = url.searchParams.get("runnerKey") || undefined;

  try {
    const result = await getCommercialPostActivationRunnerMetrics({ runnerKey });
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse(
          "COMMERCIAL_INVALID_INPUT",
          result.message,
          400,
        );
      }

      return errorResponse(
        "COMMERCIAL_INVALID_STORED_RUN",
        "As métricas persistidas do runner estão inválidas.",
        500,
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION RUNNER METRICS QUERY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível consultar as métricas do runner pós-ativação.",
      500,
    );
  }
}
