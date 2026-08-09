import { NextResponse } from "next/server";

import {
  changeSubscriptionStatus,
  type ChangeSubscriptionStatusInput,
} from "@/modules/commercial/commercial-subscription-lifecycle.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status },
  );
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: ChangeSubscriptionStatusInput;

  try {
    body = (await request.json()) as ChangeSubscriptionStatusInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await changeSubscriptionStatus(body);

    if (result.ok === false) {
      const mapping = {
        invalid_input: {
          status: 400,
          code: "COMMERCIAL_INVALID_INPUT",
        },
        subscription_not_found: {
          status: 404,
          code: "COMMERCIAL_SUBSCRIPTION_NOT_FOUND",
        },
        invalid_transition: {
          status: 409,
          code: "COMMERCIAL_INVALID_TRANSITION",
        },
        provisioning_incomplete: {
          status: 409,
          code: "COMMERCIAL_PROVISIONING_INCOMPLETE",
        },
        concurrent_change: {
          status: 409,
          code: "COMMERCIAL_CONCURRENT_CHANGE",
        },
      } as const;
      const error = mapping[result.error];

      return errorResponse(error.code, result.message, error.status);
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          replayed: result.replayed,
          subscription: result.subscription,
        },
        emittedEvents: result.emittedEvents,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("COMMERCIAL SUBSCRIPTION LIFECYCLE ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível alterar a assinatura comercial.",
      500,
    );
  }
}
