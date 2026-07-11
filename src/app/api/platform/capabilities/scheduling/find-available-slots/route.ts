//src/app/api/platform/capabilities/scheduling/find-available-slots/route.ts
import { NextResponse } from "next/server";

import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling";
import { validateInternalRequest } from "@/platform/core/security";

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

    const adapter = new SisagSchedulingAdapter();

    const result = await adapter.findAvailableSlots(
      {
        companyId,
        actor: {
          type: actorType,
          id: actorId,
        },
        correlationId: crypto.randomUUID(),
      },
      {
        professionalId,
        serviceId,
        resourceId,
        dateFrom,
        dateTo,
        durationMinutes: body.durationMinutes ?? undefined,
      },
    );

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (error) {
    console.error("PLATFORM SCHEDULING FIND AVAILABLE SLOTS ERROR:", error);

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
