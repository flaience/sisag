import { NextResponse } from "next/server";
import { ScheduleService } from "@/modules/schedules/Schedule.service";

export async function GET(_req: Request, { params }: any) {
  const { id: professionalId } = await params;
  const items = await ScheduleService.list(professionalId);
  return NextResponse.json(items);
}

export async function POST(req: Request, { params }: any) {
  try {
    const { id: professionalId } = await params;
    const body = await req.json();

    const created = await ScheduleService.create(professionalId, body);

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
