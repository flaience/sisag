import { NextResponse } from "next/server";
import { BookingReminderWorkerService } from "@/modules/automation/BookingReminderWorker.service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const expected = process.env.SISAG_INTERNAL_SECRET;
  const supplied = request.headers.get("x-sisag-internal-secret");
  if (!expected || supplied !== expected) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const batchSize = typeof body?.batchSize === "number" ? body.batchSize : 20;
  const workerId = request.headers.get("x-worker-id") ?? "booking-reminder-api";
  const result = await BookingReminderWorkerService.run({ workerId, batchSize });
  return NextResponse.json(result);
}
