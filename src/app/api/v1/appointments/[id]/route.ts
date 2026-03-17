import { NextResponse } from "next/server";
import { AppointmentService } from "@/modules/appointments/Appointment.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const appointment = await AppointmentService.getDetailed(id);

    if (!appointment) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message: "Agendamento não encontrado.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      appointment,
    });
  } catch (err: any) {
    console.error("APPOINTMENT DETAIL GET ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro ao buscar agendamento.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const result = await AppointmentService.update(id, {
      professionalId: body.professionalId,
      clientId: body.clientId,
      scheduledTime: body.scheduledTime,
      durationMinutes: body.durationMinutes,
      serviceNameSnapshot: body.serviceNameSnapshot ?? null,
      status: body.status,
      confirmedAt: body.confirmedAt,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("APPOINTMENT PATCH ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro ao atualizar agendamento.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    await AppointmentService.remove(id);

    return NextResponse.json({
      ok: true,
    });
  } catch (err: any) {
    console.error("APPOINTMENT DELETE ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro ao remover agendamento.",
      },
      { status: 400 },
    );
  }
}
