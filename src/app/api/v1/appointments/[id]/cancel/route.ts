//src/app/api/v1/appointments/[id]/cancel/route.ts
import { NextResponse } from "next/server";
import { AppointmentService } from "@/modules/appointments/Appointment.service";

export async function POST(req: Request, { params }: any) {
  const result = await AppointmentService.cancel(params.id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: 400 }
    );
  }

  return NextResponse.json(result.appointment);
}
