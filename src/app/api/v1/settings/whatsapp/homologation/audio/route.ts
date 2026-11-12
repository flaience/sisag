import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { WHATSAPP_AUDIO_POLICY } from "@/modules/assistant/audio/WhatsAppAudioTranscription";
import { runWhatsAppAudioHomologation } from "@/modules/whatsapp/homologation/WhatsAppAudioHomologationProvider.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner", "admin"]);
  if (auth.ok === false) return auth.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const durationValue = form?.get("durationSeconds");
  if (!(file instanceof File) || file.size < 1 || file.size > WHATSAPP_AUDIO_POLICY.maximumBytes) {
    return NextResponse.json({ ok: false, error: "invalid_audio_sample" }, { status: 400 });
  }
  const durationSeconds = typeof durationValue === "string" && durationValue.trim() !== "" ? Number(durationValue) : undefined;
  if (durationSeconds !== undefined && (!Number.isFinite(durationSeconds) || durationSeconds < 0 || durationSeconds > WHATSAPP_AUDIO_POLICY.maximumDurationSeconds)) {
    return NextResponse.json({ ok: false, error: "invalid_audio_duration" }, { status: 400 });
  }

  const result = await runWhatsAppAudioHomologation({ bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type, durationSeconds });
  const clientError = result.ok === false && ["unsupported_audio_type", "audio_too_long", "audio_too_large", "empty_transcription"].includes(result.error);
  return NextResponse.json(result, { status: result.ok ? 200 : clientError ? 400 : 502, headers: { "cache-control": "no-store" } });
}
