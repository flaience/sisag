import { NextResponse } from "next/server";

import { claimCommercialPostActivationDueWork } from "@/modules/commercial/commercial-post-activation-due-work-claim.service";
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
      "COMMERCIAL_INVALID_INPUT",
      "Dados para reivindicação dos trabalhos pós-ativação inválidos.",
      400,
    );
  }

  try {
    const result = await claimCommercialPostActivationDueWork(payload);
    if (result.ok === false) {
      if (result.error === "invalid_input") {
        return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
      }
      return errorResponse(
        "COMMERCIAL_INVALID_CLAIMED_WORK",
        "Os trabalhos reivindicados estão inconsistentes.",
        500,
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        workerKey: result.workerKey,
        claimed: result.claimed,
        lockedUntil: result.lockedUntil,
        items: result.items,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION DUE WORK CLAIM ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível reivindicar os trabalhos pós-ativação.",
      500,
    );
  }
}
