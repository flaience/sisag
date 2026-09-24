import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("WhatsApp audio ingestion boundary", () => {
  const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
  const parser = fs.readFileSync("src/modules/assistant/inbound/MetaWhatsAppInboundMessage.ts", "utf8");
  const receipt = fs.readFileSync("src/modules/whatsapp/meta-webhook-events.service.ts", "utf8");

  it("persists audio identity and pending state before acknowledgement", () => {
    for (const value of ["providerMessageId", "mediaId", "pending_transcription", 'messageType: inbound.kind']) expect(route + parser).toContain(value);
    expect(receipt).toContain('messageType: params.messageType ?? "text"');
  });

  it("does not send untranscribed audio to either text engine", () => {
    expect(route).toContain('if (inbound.kind === "audio") continue');
    expect(route.indexOf('if (inbound.kind === "audio") continue')).toBeLessThan(route.indexOf("ConversationEngine.process"));
  });

  it("does not activate downloads, transcription, booking or outbound delivery", () => {
    for (const forbidden of ["MetaWhatsAppMediaDownloader", "transcribeAuthorizedWhatsAppAudio", "BookingService", "outbox", "fetch("]) expect(route).not.toContain(forbidden);
  });
});
