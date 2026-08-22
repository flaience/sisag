import { NextResponse } from "next/server";

import {
  acquireCommercialPostActivationRunnerLease,
  releaseCommercialPostActivationRunnerLease,
  renewCommercialPostActivationRunnerLease,
} from "@/modules/commercial/commercial-post-activation-runner-lease.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const invalidMessage = "A ação ou os dados da lease do runner são inválidos.";
const unavailableMessage = "Não foi possível administrar a lease do executor pós-ativação.";

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("COMMERCIAL_INVALID_INPUT", invalidMessage, 400);
  }

  if (!isLeaseActionPayload(payload)) {
    return errorResponse("COMMERCIAL_INVALID_INPUT", invalidMessage, 400);
  }

  try {
    const result = payload.action === "acquire"
      ? await acquireCommercialPostActivationRunnerLease(payload)
      : payload.action === "renew"
        ? await renewCommercialPostActivationRunnerLease(payload)
        : await releaseCommercialPostActivationRunnerLease(payload);

    if (result.ok === false) {
      return errorResponse("COMMERCIAL_INVALID_INPUT", result.message, 400);
    }

    return NextResponse.json({
      ok: true,
      data: { action: payload.action, ...resultWithoutOk(result) },
    });
  } catch (error) {
    console.error("COMMERCIAL POST-ACTIVATION RUNNER LEASE ERROR:", error);
    return errorResponse("COMMERCIAL_UNKNOWN_ERROR", unavailableMessage, 500);
  }
}

function isLeaseActionPayload(value: unknown): value is Record<string, unknown> & {
  action: "acquire" | "renew" | "release";
} {
  if (!value || typeof value !== "object") return false;
  const action = (value as Record<string, unknown>).action;
  return action === "acquire" || action === "renew" || action === "release";
}

function resultWithoutOk<T extends { ok: true }>(result: T): Omit<T, "ok"> {
  const { ok: _ok, ...data } = result;
  return data;
}
