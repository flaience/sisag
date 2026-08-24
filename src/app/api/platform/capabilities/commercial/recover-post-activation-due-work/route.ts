import { NextResponse } from "next/server";

import { recoverCommercialPostActivationDueWork } from "@/modules/commercial/commercial-post-activation-due-work-recovery.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let payload: unknown;
  try {
    const text = await request.text();
    payload = text.trim() ? JSON.parse(text) : {};
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_INPUT",
      "Dados para recuperação dos trabalhos pós-ativação inválidos.",
      400,
    );
  }

  try {
    const result = await recoverCommercialPostActivationDueWork(payload);
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
      }
      return errorResponse(
        "COMMERCIAL_INVALID_EXPIRED_WORK",
        "Os trabalhos expirados encontrados estão inconsistentes.",
        500,
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        recovered: result.recovered,
        retryable: result.retryable,
        exhausted: result.exhausted,
        items: result.items,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION DUE WORK RECOVERY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível recuperar os trabalhos pós-ativação expirados.",
      500,
    );
  }
}
