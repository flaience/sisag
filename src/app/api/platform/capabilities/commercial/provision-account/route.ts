import { NextResponse } from "next/server";

import {
  provisionCommercialAccount,
  type ProvisionCommercialAccountInput,
} from "@/modules/commercial/commercial-provisioning.service";
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

  let body: ProvisionCommercialAccountInput;

  try {
    body = (await request.json()) as ProvisionCommercialAccountInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await provisionCommercialAccount(body);

    if (result.ok === false) {
      const mapping = {
        invalid_input: {
          status: 400,
          code: "COMMERCIAL_INVALID_INPUT",
        },
        tenant_not_found: {
          status: 404,
          code: "COMMERCIAL_TENANT_NOT_FOUND",
        },
        commercial_conflict: {
          status: 409,
          code: "COMMERCIAL_PROVISIONING_CONFLICT",
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
          client: result.client,
          subscription: result.subscription,
          owner: result.owner,
        },
        emittedEvents: result.emittedEvents,
      },
      { status: result.replayed ? 200 : 201 },
    );
  } catch (error) {
    console.error("COMMERCIAL PROVISIONING ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível provisionar a conta comercial.",
      500,
    );
  }
}
