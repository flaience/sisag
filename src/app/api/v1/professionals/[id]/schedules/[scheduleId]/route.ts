import { NextResponse } from "next/server";
import { ScheduleService } from "@/modules/schedules/Schedule.service";

export async function PUT(req: Request, { params }: any) {
  try {
    const { scheduleId } = await params;
    const body = await req.json();

    const updated = await ScheduleService.update(scheduleId, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: any) {
  const { scheduleId } = await params;

  await ScheduleService.remove(scheduleId);
  return NextResponse.json({ ok: true });
}
