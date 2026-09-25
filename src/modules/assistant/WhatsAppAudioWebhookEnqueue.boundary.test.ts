import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("WhatsApp audio webhook enqueue boundary", () => {
  const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
  it("persists receipt before tenant-scoped idempotent enqueue", () => {
    expect(route.indexOf("saveMetaInboundMessage")).toBeLessThan(route.indexOf("WhatsAppAudioProcessingService.enqueue"));
    for (const value of ["companyId", "whatsappAccountId", "providerMessageId", "inbound.audio.mediaId", "inbound.audio.mimeType"]) expect(route).toContain(value);
  });
  it("fails retryably when enqueue is not durable", () => {
    expect(route).toContain("AudioEnqueueStorageError");
    expect(route).toContain('error: "inbound_processing_failed"');
    expect(route).toContain("status: 503");
  });
  it("does not execute audio processing in the webhook", () => {
    for (const forbidden of ["WhatsAppAudioProcessingRunner", "OpenAIAudioTranscriber", "orchestrateMetaWhatsAppAudio", "MetaWhatsAppMediaDownloader"]) expect(route).not.toContain(forbidden);
  });
});
