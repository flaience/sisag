import { NextResponse } from "next/server";
import { AppointmentService } from "@/modules/appointments/Appointment.service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const appointment = await AppointmentService.getDetailed(params.id);

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

    return NextResponse.json(appointment);
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
