import { NextResponse } from "next/server";

import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling";
import { createOperationalUseCaseContext } from "@/platform/core/use-cases";
import { validateInternalRequest } from "@/platform/core/security";

type GetAppointmentJourneyRequestBody = {
  companyId?: string;
  appointmentId?: string;
  actorId?: string;
  actorType?: "user" | "agent" | "system" | "api";
  correlationId?: string | null;
  causationId?: string | null;
};

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status },
  );
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  try {
    const body = (await request.json()) as GetAppointmentJourneyRequestBody;
    const companyId = body.companyId?.trim() ?? "";
    const appointmentId = body.appointmentId?.trim() ?? "";

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
    if (!appointmentId) {
      return jsonError(
        "SCHEDULING_APPOINTMENT_REQUIRED",
        "appointmentId é obrigatório.",
        400,
      );
    }
    if (!uuidRe.test(appointmentId)) {
      return jsonError(
        "SCHEDULING_INVALID_APPOINTMENT_ID",
        "appointmentId inválido.",
        400,
      );
    }

    const context = createOperationalUseCaseContext({
      companyId,
      actor: {
        type: body.actorType ?? "system",
        id: body.actorId?.trim() || "platform-internal",
      },
      correlationId: body.correlationId,
      causationId: body.causationId,
    });
    const adapter = new SisagSchedulingAdapter();
    const result = await adapter.getAppointmentJourney(context, {
      appointmentId,
    });

    if (!result.ok) {
      const status =
        result.error?.code === "SCHEDULING_APPOINTMENT_NOT_FOUND"
          ? 404
          : result.error?.code === "SCHEDULING_UNKNOWN_ERROR"
            ? 500
            : 400;
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          context: { correlationId: context.correlationId },
        },
        { status },
      );
    }

    return NextResponse.json({
      ok: true,
      data: result.data,
      context: {
        correlationId: context.correlationId,
        requestedAt: context.requestedAt,
      },
    });
  } catch (error) {
    console.error("PLATFORM GET APPOINTMENT JOURNEY ERROR:", error);
    return jsonError(
      "SCHEDULING_UNKNOWN_ERROR",
      "Erro inesperado ao carregar a jornada do agendamento.",
      500,
    );
  }
}
