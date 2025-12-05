// src/app/api/v1/appointments/route.ts
import { NextResponse } from "next/server";
import { AppointmentService } from "@/modules/appointments/Appointment.service";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;

  const filters = {
    date: params.get("date") ?? undefined,
    search: params.get("search") ?? undefined,
    professionalId: params.get("professionalId") ?? undefined,
  };

  const rows = await AppointmentService.list(filters);

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await AppointmentService.create({
      professionalId: body.professionalId,
      clientId: body.clientId,
      scheduledTime: body.scheduledTime,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("APPOINTMENTS POST ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 }
    );
  }
}
