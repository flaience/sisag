import { describe, expect, it, vi } from "vitest";
import { runWhatsAppAudioHomologation } from "./WhatsAppAudioHomologationProvider.service";

describe("WhatsApp audio homologation provider", () => {
  it("transcribes with an injected secret-backed provider", async () => {
    const transcribe = vi.fn(async () => ({ text: "agendar consulta" }));
    await expect(runWhatsAppAudioHomologation({ bytes: new Uint8Array([1]), mimeType: "audio/ogg" }, { readApiKey: async () => "secret", transcribe })).resolves.toMatchObject({ ok: true, text: "agendar consulta", policyVersion: "whatsapp_audio_v1" });
    expect(transcribe).toHaveBeenCalledOnce();
  });

  it("fails closed when the secret is unavailable", async () => {
    const transcribe = vi.fn();
    await expect(runWhatsAppAudioHomologation({ bytes: new Uint8Array([1]), mimeType: "audio/ogg" }, { readApiKey: async () => null, transcribe })).resolves.toEqual({ ok: false, error: "openai_invalid_configuration", policyVersion: "whatsapp_audio_v1" });
    expect(transcribe).not.toHaveBeenCalled();
  });
});
