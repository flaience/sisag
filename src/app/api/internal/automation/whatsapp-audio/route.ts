import { NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import { defaultWhatsAppAudioWorkerDependencies, WhatsAppAudioProcessingWorkerService } from "@/modules/assistant/audio/WhatsAppAudioProcessingWorker.service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const expected = readEnv("SISAG_INTERNAL_SECRET");
  const supplied = request.headers.get("x-sisag-internal-secret");
  if (!expected || supplied !== expected) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const batchSize = typeof body?.batchSize === "number" ? body.batchSize : 10;
  const result = await WhatsAppAudioProcessingWorkerService.run({ batchSize }, defaultWhatsAppAudioWorkerDependencies(fetch));
  return NextResponse.json(result);
}
