import { NextResponse } from "next/server";

import {
  recordCommercialOnboardingTrainingProgress,
  type RecordCommercialOnboardingTrainingProgressInput,
} from "@/modules/commercial/commercial-onboarding-training-progress.service";
import { validateInternalRequest } from "@/platform/core/security";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  let body: RecordCommercialOnboardingTrainingProgressInput;
  try {
    body = (await request.json()) as RecordCommercialOnboardingTrainingProgressInput;
  } catch {
    return errorResponse(
      "COMMERCIAL_INVALID_JSON",
      "O corpo da requisição deve conter um JSON válido.",
      400,
    );
  }

  try {
    const result = await recordCommercialOnboardingTrainingProgress(body);
    if (result.ok === false) {
      const mapping = {
        invalid_input: [400, "COMMERCIAL_INVALID_INPUT"],
        training_not_found: [404, "COMMERCIAL_ONBOARDING_TRAINING_NOT_FOUND"],
        training_not_available: [409, "COMMERCIAL_ONBOARDING_TRAINING_NOT_AVAILABLE"],
      } as const;
      const [status, code] = mapping[result.error];
      return errorResponse(code, result.message, status);
    }

    return NextResponse.json({
      ok: true,
      data: {
        replayed: result.replayed,
        onboardingId: result.onboardingId,
        completedModules: result.completedModules,
        totalModules: result.totalModules,
        percentage: result.percentage,
        readyToComplete: result.readyToComplete,
        missingModules: result.missingModules,
      },
    });
  } catch (error) {
    console.error("COMMERCIAL ONBOARDING TRAINING PROGRESS ERROR:", error);
    return errorResponse(
      "COMMERCIAL_UNKNOWN_ERROR",
      "Não foi possível registrar o progresso do treinamento comercial.",
      500,
    );
  }
}
