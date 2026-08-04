import { NextResponse } from "next/server";

import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling";
import { createOperationalUseCaseContext } from "@/platform/core/use-cases";
import { validateInternalRequest } from "@/platform/core/security";
import { FindAvailableSlotsUseCase } from "@/platform/use-cases";

type FindAvailableSlotsRequestBody = {
  companyId?: string;
  actorId?: string;
  actorType?: "user" | "agent" | "system" | "api";

  professionalId?: string | null;
  serviceId?: string | null;
  resourceId?: string | null;

  dateFrom?: string;
  dateTo?: string;
  durationMinutes?: number | null;
  limit?: number;
  stepMinutes?: number;

  correlationId?: string | null;
  causationId?: string | null;
};

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);

  if (auth.ok === false) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as FindAvailableSlotsRequestBody;

    const companyId = body.companyId?.trim() ?? "";
    const actorId = body.actorId?.trim() || "platform-internal";
    const actorType = body.actorType ?? "system";

    const professionalId = body.professionalId?.trim() || undefined;
    const serviceId = body.serviceId?.trim() || undefined;
    const resourceId = body.resourceId?.trim() || undefined;

    const dateFrom = body.dateFrom?.trim() ?? "";
    const dateTo = body.dateTo?.trim() ?? "";

    if (!companyId) {
      return jsonError(
        "SCHEDULING_COMPANY_REQUIRED",
        "companyId é obrigatório.",
        400,
      );
    }

    if (!uuidRe.test(companyId)) {
      return jsonError(
        "SCHEDULING_INVALID_COMPANY_ID",
        "companyId inválido.",
        400,
      );
    }

    if (professionalId && !uuidRe.test(professionalId)) {
      return jsonError(
        "SCHEDULING_INVALID_PROFESSIONAL_ID",
        "professionalId inválido.",
        400,
      );
    }

    if (serviceId && !uuidRe.test(serviceId)) {
      return jsonError(
        "SCHEDULING_INVALID_SERVICE_ID",
        "serviceId inválido.",
        400,
      );
    }

    if (resourceId && !uuidRe.test(resourceId)) {
      return jsonError(
        "SCHEDULING_INVALID_RESOURCE_ID",
        "resourceId inválido.",
        400,
      );
    }

    if (!dateFrom || !dateTo) {
      return jsonError(
        "SCHEDULING_DATE_RANGE_REQUIRED",
        "dateFrom e dateTo são obrigatórios.",
        400,
      );
    }

    if (
      body.durationMinutes !== undefined &&
      body.durationMinutes !== null &&
      (!Number.isFinite(body.durationMinutes) ||
        body.durationMinutes <= 0 ||
        body.durationMinutes > 24 * 60)
    ) {
      return jsonError(
        "SCHEDULING_INVALID_DURATION",
        "durationMinutes inválido.",
        400,
      );
    }

    if (
      body.limit !== undefined &&
      (!Number.isInteger(body.limit) || body.limit <= 0 || body.limit > 2_000)
    ) {
      return jsonError(
        "SCHEDULING_INVALID_LIMIT",
        "limit deve ser um número inteiro entre 1 e 2000.",
        400,
      );
    }

    if (
      body.stepMinutes !== undefined &&
      (!Number.isInteger(body.stepMinutes) ||
        body.stepMinutes <= 0 ||
        body.stepMinutes > 24 * 60)
    ) {
      return jsonError(
        "SCHEDULING_INVALID_STEP_MINUTES",
        "stepMinutes deve ser um número inteiro entre 1 e 1440.",
        400,
      );
    }

    const adapter = new SisagSchedulingAdapter();
    const useCase = new FindAvailableSlotsUseCase(adapter);

    const context = createOperationalUseCaseContext({
      companyId,
      actor: {
        type: actorType,
        id: actorId,
      },
      correlationId: body.correlationId,
      causationId: body.causationId,
    });

    const result = await useCase.execute(context, {
      professionalId,
      serviceId,
      resourceId,
      dateFrom,
      dateTo,
      durationMinutes: body.durationMinutes ?? undefined,
      limit: body.limit,
      stepMinutes: body.stepMinutes,
    });

    if (result.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          context: {
            correlationId: context.correlationId,
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: result.value,
        context: {
          correlationId: context.correlationId,
          requestedAt: context.requestedAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PLATFORM FIND AVAILABLE SLOTS USE CASE ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SCHEDULING_UNKNOWN_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro inesperado ao consultar disponibilidade.",
        },
      },
      { status: 500 },
    );
  }
}
