import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("WhatsApp audio processing lifecycle boundary", () => {
  const service = fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioProcessing.service.ts", "utf8");
  const schema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

  it("scopes every mutable transition to tenant, state and lease", () => {
    expect(service.split("eq(whatsappAudioProcessing.companyId").length - 1).toBeGreaterThanOrEqual(4);
    expect(service.split("eq(whatsappAudioProcessing.status").length - 1).toBeGreaterThanOrEqual(4);
    expect(service.split("eq(whatsappAudioProcessing.leaseToken").length - 1).toBeGreaterThanOrEqual(3);
  });

  it("bounds attempts, leases and transcript persistence", () => {
    for (const value of ["maximumAttempts: 3", "leaseMilliseconds: 60_000", "maximumTranscriptCharacters: 20_000", "safeErrorCode"]) expect(service).toContain(value);
    for (const value of ["whatsapp_audio_processing_attempts_check", "whatsapp_audio_processing_transcript_check", ".enableRLS()"] ) expect(schema).toContain(value);
  });

  it("keeps processing disconnected from the request webhook", () => {
    expect(route).not.toContain("WhatsAppAudioProcessingService");
    expect(service).not.toContain("AssistantWhatsAppService");
    expect(service).not.toContain("BookingService");
  });
});
