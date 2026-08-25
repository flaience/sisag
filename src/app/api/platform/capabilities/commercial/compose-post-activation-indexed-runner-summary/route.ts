import { NextResponse } from "next/server";

import { composeCommercialPostActivationIndexedRunnerSummary } from "@/modules/commercial/commercial-post-activation-indexed-runner-summary.service";
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
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = composeCommercialPostActivationIndexedRunnerSummary(payload);
    if (result.ok === false) {
      return errorResponse(
        "COMMERCIAL_INVALID_INPUT",
        "Resumos do pipeline indexado pós-ativação inválidos.",
        400,
      );
    }

    return NextResponse.json({ ok: true, data: result.summary });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION INDEXED RUNNER SUMMARY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível compor o resumo do pipeline pós-ativação.",
      500,
    );
  }
}
