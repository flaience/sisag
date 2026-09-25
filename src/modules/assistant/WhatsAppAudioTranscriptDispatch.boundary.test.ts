import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("WhatsApp audio transcript dispatch boundary", () => {
  const source = fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioTranscriptDispatch.service.ts", "utf8");
  const schema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
  const migration = fs.readFileSync("infra/whatsapp-audio-transcript-dispatch.sql", "utf8");
  it("keeps claim, completion and failure tenant and lease scoped", () => {
    expect(source.split("eq(whatsappAudioProcessing.companyId").length - 1).toBeGreaterThanOrEqual(3);
    expect(source.split("eq(whatsappAudioProcessing.dispatchLeaseToken").length - 1).toBeGreaterThanOrEqual(2);
    expect(source).toContain('eq(whatsappAudioProcessing.status, "completed")');
  });
  it("reuses the original provider identity for committed-reply idempotency", () => {
    for (const value of ["providerMessageId", "correlationId: claimed.providerMessageId", "AssistantWhatsAppService.handleInbound", 'eq(messageLogs.messageType, "audio")']) expect(source).toContain(value);
  });
  it("adds bounded dispatch state without changing transcription state", () => {
    for (const value of ["dispatch_attempts", "dispatch_lease_token", "dispatch_lease_expires_at", "dispatched_at"]) expect(schema + migration).toContain(value);
    expect(migration).toContain("dispatch_attempts BETWEEN 0 AND 3");
  });
});
