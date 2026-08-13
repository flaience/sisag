import { NextResponse } from "next/server";

import {
  recordCommercialOnboardingGoLiveProgress,
  type RecordCommercialOnboardingGoLiveProgressInput,
} from "@/modules/commercial/commercial-onboarding-go-live-progress.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: RecordCommercialOnboardingGoLiveProgressInput;
  try {
    body = (await request.json()) as RecordCommercialOnboardingGoLiveProgressInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await recordCommercialOnboardingGoLiveProgress(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        go_live_not_found: [404, "COMMERCIAL_ONBOARDING_GO_LIVE_NOT_FOUND"],
        go_live_not_available: [409, "COMMERCIAL_ONBOARDING_GO_LIVE_NOT_AVAILABLE"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({
      ok: true,
      data: {
        replayed: result.replayed,
        onboardingId: result.onboardingId,
        passedChecks: result.passedChecks,
        totalChecks: result.totalChecks,
        percentage: result.percentage,
        readyToComplete: result.readyToComplete,
        missingChecks: result.missingChecks,
        failedChecks: result.failedChecks,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING GO-LIVE PROGRESS ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível registrar o progresso da validação de go-live.",
      500,
    );
  }
}

