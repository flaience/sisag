import { describe, expect, it, vi } from "vitest";
import { WHATSAPP_AUDIO_POLICY } from "@/modules/assistant/audio/WhatsAppAudioTranscription";
import { transcribeWhatsAppAudioHomologation } from "./WhatsAppAudioHomologationTranscription.service";

describe("WhatsApp audio homologation transcription", () => {
  it("reuses the production audio policy and returns only a sanitized transcript", async () => {
    const transcribe = vi.fn(async () => ({ text: " Quero marcar uma consulta ", confidence: 0.94 }));
    await expect(transcribeWhatsAppAudioHomologation({ bytes: new Uint8Array([1, 2, 3]), mimeType: "audio/ogg", durationSeconds: 8 }, { transcribe })).resolves.toEqual({ ok: true, text: "Quero marcar uma consulta", confidence: 0.94, policyVersion: "whatsapp_audio_v1" });
    expect(transcribe).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "audio/ogg", language: "pt-BR", timeoutMs: WHATSAPP_AUDIO_POLICY.timeoutMs }));
  });

  it.each([
    [{ bytes: new Uint8Array(), mimeType: "audio/ogg" }, "empty_transcription"],
    [{ bytes: new Uint8Array([1]), mimeType: "video/mp4" }, "unsupported_audio_type"],
    [{ bytes: new Uint8Array([1]), mimeType: "audio/ogg", durationSeconds: 181 }, "audio_too_long"],
  ])("rejects an invalid homologation sample %#", async (input, error) => {
    const transcribe = vi.fn();
    await expect(transcribeWhatsAppAudioHomologation(input, { transcribe })).resolves.toMatchObject({ ok: false, error });
    expect(transcribe).not.toHaveBeenCalled();
  });
});
