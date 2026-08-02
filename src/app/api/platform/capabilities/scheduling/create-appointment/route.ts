// src/app/api/platform/capabilities/scheduling/create-appointment/route.ts
import { NextResponse } from "next/server";

import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling";
import { createOperationalUseCaseContext } from "@/platform/core/use-cases";
import { validateInternalRequest } from "@/platform/core/security";

type CreateAppointmentRequestBody = {
  companyId?: string;
  actorId?: string;
  actorType?: "user" | "agent" | "system" | "api";

  clientId?: string;
  professionalId?: string | null;
  serviceId?: string | null;
  resourceIds?: string[];
  startsAt?: string;
  endsAt?: string;
  notes?: string | null;

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
    const body = (await request.json()) as CreateAppointmentRequestBody;

    const companyId = body.companyId?.trim() ?? "";
    const actorId = body.actorId?.trim() || "platform-internal";
    const actorType = body.actorType ?? "system";

    const clientId = body.clientId?.trim() ?? "";
    const professionalId = body.professionalId?.trim() || undefined;
    const serviceId = body.serviceId?.trim() || undefined;

    const startsAt = body.startsAt?.trim() ?? "";
    const endsAt = body.endsAt?.trim() ?? "";

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

    if (!clientId) {
      return jsonError(
        "SCHEDULING_CLIENT_REQUIRED",
        "clientId é obrigatório.",
        400,
      );
    }

    if (!uuidRe.test(clientId)) {
      return jsonError(
        "SCHEDULING_INVALID_CLIENT_ID",
        "clientId inválido.",
        400,
      );
    }

    if (!serviceId) {
      return jsonError(
        "SCHEDULING_SERVICE_REQUIRED",
        "serviceId é obrigatório.",
        400,
      );
    }

    if (!uuidRe.test(serviceId)) {
      return jsonError(
        "SCHEDULING_INVALID_SERVICE_ID",
        "serviceId inválido.",
        400,
      );
    }

    if (!startsAt || !endsAt) {
      return jsonError(
        "SCHEDULING_DATETIME_REQUIRED",
        "startsAt e endsAt são obrigatórios.",
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

    const adapter = new SisagSchedulingAdapter();

    const context = createOperationalUseCaseContext({
      companyId,
      actor: {
        type: actorType,
        id: actorId,
      },
      correlationId: body.correlationId,
      causationId: body.causationId,
    });

    const result = await adapter.createAppointment(context, {
      clientId,
      professionalId: professionalId ?? null,
      serviceId,
      resourceIds: body.resourceIds,
      startsAt,
      endsAt,
      notes: body.notes ?? null,
    });

    if (result.ok === false) {
      const status =
        result.error?.code === "SCHEDULING_SLOT_NOT_AVAILABLE"
          ? 409
          : result.error?.code === "SCHEDULING_UNKNOWN_ERROR"
            ? 500
            : 400;

      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          context: {
            correlationId: context.correlationId,
          },
        },
        { status },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: result.data,
        emittedEvents: result.emittedEvents,
        context: {
          correlationId: context.correlationId,
          requestedAt: context.requestedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("PLATFORM CREATE APPOINTMENT ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SCHEDULING_UNKNOWN_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro inesperado ao criar agendamento.",
        },
      },
      { status: 500 },
    );
  }
}
