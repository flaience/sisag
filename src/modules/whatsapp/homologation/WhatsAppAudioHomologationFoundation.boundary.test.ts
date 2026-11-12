import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("src/modules/whatsapp/homologation/WhatsAppAudioHomologationTranscription.service.ts", "utf8");
const production = readFileSync("src/modules/assistant/audio/WhatsAppAudioTranscription.ts", "utf8");

describe("WhatsApp audio homologation foundation boundary", () => {
  it("reuses the same bounded production transcription policy", () => {
    expect(service).toContain("transcribeAuthorizedWhatsAppAudio");
    expect(service).toContain('mediaId: "homologation-upload"');
    for (const value of ["maximumBytes", "maximumDurationSeconds", "allowedMimeTypes", "timeoutMs", "whatsapp_audio_v1"]) expect(production).toContain(value);
  });

  it("does not depend on Meta download scheduling mutation or external delivery", () => {
    for (const forbidden of ["MetaWhatsAppMediaDownloader", "AssistantWhatsAppService", "executeBookingCommand", "OutboxPublisher", "getDb("]) expect(service).not.toContain(forbidden);
  });
});
