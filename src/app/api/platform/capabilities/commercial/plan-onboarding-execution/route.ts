import { NextResponse } from "next/server";

import { planCommercialOnboardingExecution } from "@/modules/commercial/commercial-onboarding-executor.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const onboardingId = url.searchParams.get("onboardingId") ?? undefined;
  const commercialClientId = url.searchParams.get("commercialClientId") ?? undefined;

  try {
    const result = await planCommercialOnboardingExecution({ onboardingId, commercialClientId });
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
        query_failed: [500, "COMMERCIAL_ONBOARDING_QUERY_FAILED"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({
      ok: true,
      data: {
        decision: result.decision,
        reason: result.reason,
        command: result.command,
        snapshot: result.snapshot,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING EXECUTION PLANNING ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível planejar a execução do onboarding comercial.",
      500,
    );
  }
}
