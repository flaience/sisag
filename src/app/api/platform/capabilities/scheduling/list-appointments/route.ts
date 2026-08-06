import { NextResponse } from "next/server";

import type { SchedulingAppointmentState } from "@/platform/capabilities/scheduling";
import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling";
import { createOperationalUseCaseContext } from "@/platform/core/use-cases";
import { validateInternalRequest } from "@/platform/core/security";

type ListAppointmentsRequestBody = {
  companyId?: string;
  actorId?: string;
  actorType?: "user" | "agent" | "system" | "api";
  state?: SchedulingAppointmentState;
  from?: string;
  to?: string;
  clientId?: string;
  professionalId?: string;
  serviceId?: string;
  limit?: number;
  offset?: number;
  correlationId?: string | null;
  causationId?: string | null;
};

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedStates = new Set<SchedulingAppointmentState>([
  "requested",
  "pending",
  "confirmed",
  "rescheduled",
  "cancelled",
  "completed",
  "expired",
  "no_show",
]);

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;

  try {
    const body = (await request.json()) as ListAppointmentsRequestBody;
    const companyId = body.companyId?.trim() ?? "";

    if (!uuidRe.test(companyId)) {
      return jsonError(
        companyId ? "SCHEDULING_INVALID_COMPANY_ID" : "SCHEDULING_COMPANY_REQUIRED",
        companyId ? "companyId inválido." : "companyId é obrigatório.",
      );
    }

    for (const [name, value] of [
      ["clientId", body.clientId],
      ["professionalId", body.professionalId],
      ["serviceId", body.serviceId],
    ] as const) {
      if (value && !uuidRe.test(value)) {
        return jsonError("SCHEDULING_INVALID_FILTER", `${name} inválido.`);
      }
    }

    if (body.state && !allowedStates.has(body.state)) {
      return jsonError("SCHEDULING_INVALID_STATE", "state inválido.");
    }
    if (
      body.limit !== undefined &&
      (!Number.isInteger(body.limit) || body.limit < 1 || body.limit > 100)
    ) {
      return jsonError(
        "SCHEDULING_INVALID_LIMIT",
        "limit deve ser um número inteiro entre 1 e 100.",
      );
    }
    if (
      body.offset !== undefined &&
      (!Number.isInteger(body.offset) || body.offset < 0)
    ) {
      return jsonError(
        "SCHEDULING_INVALID_OFFSET",
        "offset deve ser um número inteiro maior ou igual a zero.",
      );
    }

    const from = body.from ? new Date(body.from) : null;
    const to = body.to ? new Date(body.to) : null;
    if (
      (from && Number.isNaN(from.getTime())) ||
      (to && Number.isNaN(to.getTime())) ||
      (from && to && to <= from)
    ) {
      return jsonError(
        "SCHEDULING_INVALID_INTERVAL",
        "O intervalo informado é inválido.",
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
    const result = await adapter.listAppointments(context, {
      state: body.state,
      from: body.from,
      to: body.to,
      clientId: body.clientId,
      professionalId: body.professionalId,
      serviceId: body.serviceId,
      limit: body.limit,
      offset: body.offset,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          context: { correlationId: context.correlationId },
        },
        { status: result.error?.code === "SCHEDULING_UNKNOWN_ERROR" ? 500 : 400 },
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
    console.error("PLATFORM LIST APPOINTMENTS ERROR:", error);
    return jsonError(
      "SCHEDULING_UNKNOWN_ERROR",
      "Erro inesperado ao listar agendamentos.",
      500,
    );
  }
}
