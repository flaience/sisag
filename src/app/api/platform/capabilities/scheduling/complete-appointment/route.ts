import { NextResponse } from "next/server";

import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling";
import { createOperationalUseCaseContext } from "@/platform/core/use-cases";
import { validateInternalRequest } from "@/platform/core/security";

type CompleteAppointmentRequestBody = {
  companyId?: string;
  actorId?: string;
  actorType?: "user" | "agent" | "system" | "api";
  appointmentId?: string;
  notes?: string | null;
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
    const body = (await request.json()) as CompleteAppointmentRequestBody;
    const companyId = body.companyId?.trim() ?? "";
    const actorId = body.actorId?.trim() || "platform-internal";
    const actorType = body.actorType ?? "system";
    const appointmentId = body.appointmentId?.trim() ?? "";
    const notes = body.notes?.trim() || null;

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

    const adapter = new SisagSchedulingAdapter();
    const context = createOperationalUseCaseContext({
      companyId,
      actor: { type: actorType, id: actorId },
      correlationId: body.correlationId,
      causationId: body.causationId,
    });

    const result = await adapter.completeAppointment(context, {
      appointmentId,
      notes,
    });

    if (result.ok === false) {
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
      { status: 200 },
    );
  } catch (error) {
    console.error("PLATFORM COMPLETE APPOINTMENT ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SCHEDULING_UNKNOWN_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro inesperado ao concluir agendamento.",
        },
      },
      { status: 500 },
    );
  }
}
