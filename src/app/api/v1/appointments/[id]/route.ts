//src/app/api/v1/appointments/[id]/route.ts

import { NextResponse } from "next/server";
import { AppointmentService } from "@/modules/appointments/Appointment.service";

export async function GET(_req: Request, { params }: any) {
  const item = await AppointmentService.get(params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: Request, { params }: any) {
  try {
    const body = await req.json();
    const updated = await AppointmentService.update(params.id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: any) {
  await AppointmentService.remove(params.id);
  return NextResponse.json({ ok: true });
}
