import { NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import { BookingRecoverySlaEscalationService } from "@/modules/automation/BookingRecoverySlaEscalation.service";
export const runtime = "nodejs";
export async function POST(request: Request) { const expected = readEnv("SISAG_INTERNAL_SECRET"); if (!expected || request.headers.get("x-sisag-internal-secret") !== expected) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }); const body = await request.json().catch(() => ({})); return NextResponse.json(await BookingRecoverySlaEscalationService.run({ slaHours: typeof body?.slaHours === "number" ? body.slaHours : undefined, batchSize: typeof body?.batchSize === "number" ? body.batchSize : undefined })); }
