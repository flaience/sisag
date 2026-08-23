import { NextResponse } from "next/server";

import { getCommercialPostActivationDueWorkSnapshot } from "@/modules/commercial/commercial-post-activation-due-work-query.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  try {
    const result = await getCommercialPostActivationDueWorkSnapshot();
    if (result.ok === false) {
      return errorResponse(
        "COMMERCIAL_INVALID_DUE_WORK_SNAPSHOT",
        "Os indicadores persistidos da fila pós-ativação estão inválidos.",
        500,
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION DUE WORK QUERY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível consultar a fila de trabalhos pós-ativação.",
      500,
    );
  }
}
