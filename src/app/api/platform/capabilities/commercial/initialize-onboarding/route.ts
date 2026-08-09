import { NextResponse } from "next/server";

import {
  initializeCommercialOnboarding,
  type InitializeCommercialOnboardingInput,
} from "@/modules/commercial/commercial-onboarding.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: InitializeCommercialOnboardingInput;
  try {
    body = (await request.json()) as InitializeCommercialOnboardingInput;
  } catch {
    return errorResponse("COMMERCIAL_INVALID_JSON", "O corpo da requisição deve conter um JSON válido.", 400);
  }

  try {
    const result = await initializeCommercialOnboarding(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        commercial_client_not_found: [404, "COMMERCIAL_CLIENT_NOT_FOUND"],
        commercial_client_not_eligible: [409, "COMMERCIAL_CLIENT_NOT_ELIGIBLE"],
        initialization_conflict: [409, "COMMERCIAL_ONBOARDING_CONFLICT"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }
    return NextResponse.json({ ok: true, data: { replayed: result.replayed, reconciledSteps: result.reconciledSteps, onboarding: result.onboarding }, emittedEvents: result.emittedEvents }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING INITIALIZATION ERROR:", error);
    return errorResponse("COMMERCIAL_UNKNOWN_ERROR", "Não foi possível inicializar o onboarding comercial.", 500);
  }
}
