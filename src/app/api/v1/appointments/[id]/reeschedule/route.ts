//src/app/api/v1/appointments/[id]/reeschedule/route.ts

import { NextResponse } from "next/server";
import { AppointmentService } from "@/modules/appointments/Appointment.service";

export async function POST(req: Request, { params }: any) {
  const body = await req.json();

  const result = await AppointmentService.reschedule(
    params.id,
    body.scheduledTime
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: 400 }
    );
  }

  return NextResponse.json(result.appointment);
}
