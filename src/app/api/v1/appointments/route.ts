//src/app/api/v1/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { AppointmentService } from "@/modules/appointments/Appointment.service";
// teste
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireApiRole(req, ["owner", "admin", "staff"]);
    if (authResult.ok === false) return authResult.response;
    const companyId = authResult.auth.companyId;
    const params = new URL(req.url).searchParams;

    const filters = {
      date: params.get("date") ?? undefined,
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
      search: params.get("search") ?? undefined,
      professionalId: params.get("professionalId") ?? undefined,
      status: params.get("status") ?? undefined,
      companyId,
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

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApiRole(req, ["owner", "admin", "staff"]);
    if (authResult.ok === false) return authResult.response;
    const companyId = authResult.auth.companyId;
    const body = await req.json();

    const result = await AppointmentService.create({
      companyId,
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
