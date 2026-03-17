import { NextResponse } from "next/server";
import { AppointmentService } from "@/modules/appointments/Appointment.service";

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;

    const filters = {
      date: params.get("date") ?? undefined,
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
      search: params.get("search") ?? undefined,
      professionalId: params.get("professionalId") ?? undefined,
      status: params.get("status") ?? undefined,
      companyId: params.get("companyId") ?? undefined,
    };

    const rows = await AppointmentService.list(filters);

    return NextResponse.json({
      ok: true,
      appointments: rows,
    });
  } catch (err: any) {
    console.error("APPOINTMENTS GET ERROR:", err);

    return NextResponse.json(
      { ok: false, error: err.message ?? "Erro ao listar agendamentos." },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await AppointmentService.create({
      professionalId: body.professionalId,
      clientId: body.clientId,
      scheduledTime: body.scheduledTime,
      durationMinutes: body.durationMinutes,
      serviceNameSnapshot: body.serviceNameSnapshot ?? null,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("APPOINTMENTS POST ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro ao criar agendamento.",
      },
      { status: 400 },
    );
  }
}
