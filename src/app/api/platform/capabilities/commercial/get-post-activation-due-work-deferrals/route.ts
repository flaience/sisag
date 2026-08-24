import { NextResponse } from "next/server";

import { listCommercialPostActivationDueWorkDeferrals } from "@/modules/commercial/commercial-post-activation-due-work-deferral-query.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const input = {
    ...(url.searchParams.has("state")
      ? { state: url.searchParams.get("state") }
      : {}),
    ...(url.searchParams.has("limit")
      ? { limit: Number(url.searchParams.get("limit")) }
      : {}),
    ...(url.searchParams.has("offset")
      ? { offset: Number(url.searchParams.get("offset")) }
      : {}),
  };

  try {
    const result = await listCommercialPostActivationDueWorkDeferrals(input);
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse(
          "COMMERCIAL_INVALID_INPUT",
          "Filtros para consulta dos adiamentos pós-ativação inválidos.",
          400,
        );
      }
      return errorResponse(
        "COMMERCIAL_INVALID_DUE_WORK_DEFERRAL_SNAPSHOT",
        "Os indicadores persistidos de adiamento pós-ativação estão inválidos.",
        500,
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION DUE WORK DEFERRAL QUERY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível consultar os adiamentos pós-ativação.",
      500,
    );
  }
}
