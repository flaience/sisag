import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("WhatsApp audio processing runner boundary", () => {
  const source = fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioProcessingRunner.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

  it("connects lifecycle, downloader orchestration and transcriber without bypassing leases", () => {
    for (const value of ["WhatsAppAudioProcessingService.claim", "orchestrateMetaWhatsAppAudio", "OpenAIAudioTranscriber", "dependencies.complete", "dependencies.fail", "claimed.leaseToken"]) expect(source).toContain(value);
  });
  it("requires explicit credentials and transport", () => {
    for (const value of ["metaAccessToken: string", "openAIApiKey: string", "fetch:"]) expect(source).toContain(value);
    for (const forbidden of ["process.env", "console.", "META_ACCESS_TOKEN", "OPENAI_API_KEY"]) expect(source).not.toContain(forbidden);
  });
  it("does not activate webhook, assistant, booking or outbound delivery", () => {
    expect(route).not.toContain("WhatsAppAudioProcessingRunner");
    for (const forbidden of ["AssistantWhatsAppService", "BookingService", "outbox"]) expect(source).not.toContain(forbidden);
  });
});
