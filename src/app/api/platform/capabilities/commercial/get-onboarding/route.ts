import { NextResponse } from "next/server";

import { getCommercialOnboardingQuery } from "@/modules/commercial/commercial-onboarding-query.service";
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
    const result = await getCommercialOnboardingQuery({ onboardingId, commercialClientId });

    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        onboarding_not_found: [404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING QUERY ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível consultar o onboarding comercial.",
      500,
    );
  }
}
