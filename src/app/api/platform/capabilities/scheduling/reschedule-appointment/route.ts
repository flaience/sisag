import { NextResponse } from "next/server";

import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling";
import { createOperationalUseCaseContext } from "@/platform/core/use-cases";
import { validateInternalRequest } from "@/platform/core/security";

type RequestBody = {
  companyId?: string;
  actorId?: string;
  actorType?: "user" | "agent" | "system" | "api";
  appointmentId?: string;
  startsAt?: string;
  endsAt?: string;
  reason?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
};

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  try {
    const body = (await request.json()) as RequestBody;
    const companyId = body.companyId?.trim() ?? "";
    const appointmentId = body.appointmentId?.trim() ?? "";
    const startsAt = body.startsAt?.trim() ?? "";
    const endsAt = body.endsAt?.trim() ?? "";

    if (!uuidRe.test(companyId)) {
      return jsonError(
        companyId ? "SCHEDULING_INVALID_COMPANY_ID" : "SCHEDULING_COMPANY_REQUIRED",
        companyId ? "companyId inválido." : "companyId é obrigatório.",
      );
    }
    if (!uuidRe.test(appointmentId)) {
      return jsonError(
        appointmentId
          ? "SCHEDULING_INVALID_APPOINTMENT_ID"
          : "SCHEDULING_APPOINTMENT_REQUIRED",
        appointmentId ? "appointmentId inválido." : "appointmentId é obrigatório.",
      );
    }
    if (!startsAt || !endsAt) {
      return jsonError(
        "SCHEDULING_DATETIME_REQUIRED",
        "startsAt e endsAt são obrigatórios.",
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
    const result = await new SisagSchedulingAdapter().rescheduleAppointment(
      context,
      {
        appointmentId,
        startsAt,
        endsAt,
        reason: body.reason?.trim() || null,
      },
    );

    if (result.ok === false) {
      const status =
        result.error?.code === "SCHEDULING_APPOINTMENT_NOT_FOUND"
          ? 404
          : result.error?.code === "SCHEDULING_SLOT_NOT_AVAILABLE"
            ? 409
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
      emittedEvents: result.emittedEvents,
      context: {
        correlationId: context.correlationId,
        requestedAt: context.requestedAt,
      },
    });
  } catch (error) {
    console.error("PLATFORM RESCHEDULE APPOINTMENT ERROR:", error);
    return jsonError(
      "SCHEDULING_UNKNOWN_ERROR",
      error instanceof Error
        ? error.message
        : "Erro inesperado ao reagendar agendamento.",
      500,
    );
  }
}
