import { NextResponse } from "next/server";

import {
  projectCommercialPostActivationDueWork,
  type ProjectCommercialPostActivationDueWorkInput,
} from "@/modules/commercial/commercial-post-activation-due-work-projection-runner.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: ProjectCommercialPostActivationDueWorkInput;
  try {
    const text = await request.text();
    body = text.trim()
      ? JSON.parse(text) as ProjectCommercialPostActivationDueWorkInput
      : {};
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await projectCommercialPostActivationDueWork(body);
    if (result.ok === false) {
      return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
    }

    return NextResponse.json({
      ok: true,
      data: {
        scanned: result.scanned,
        cursor: result.cursor,
        wrapped: result.wrapped,
        synchronized: result.synchronized,
        failed: result.failed,
        created: result.created,
        updated: result.updated,
        preserved: result.preserved,
        completed: result.completed,
        failures: result.failures,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION DUE WORK PROJECTION ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível projetar os trabalhos pós-ativação.",
      500,
    );
  }
}
