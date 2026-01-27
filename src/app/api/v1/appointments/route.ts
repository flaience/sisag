// src/app/api/v1/appointments/route.ts
import { NextResponse } from "next/server";
import { AppointmentService } from "@/modules/appointments/Appointment.service";
import { OutboxService } from "@/modules/outbox/Outbox.service";

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

    if (!result.ok || !result.appointment) {
      return NextResponse.json(
        { ok: false, error: "APPOINTMENT_CREATE_FAILED" },
        { status: 400 },
      );
    }

    const appointment = result.appointment;

    await OutboxService.enqueue({
      aggregateType: "appointment",
      aggregateId: appointment.id,
      eventType: "appointment.created",
      payload: {
        appointmentId: appointment.id,
        professionalId: appointment.professionalId,
        clientId: appointment.clientId,
        scheduledTime: appointment.scheduledTime,
        occurredAt: new Date().toISOString(),
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("APPOINTMENTS POST ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 },
    );
  }
}
