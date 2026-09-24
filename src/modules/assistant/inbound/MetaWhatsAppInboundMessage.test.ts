import { describe, expect, it } from "vitest";
import { parseMetaWhatsAppInboundMessage } from "./MetaWhatsAppInboundMessage";

describe("Meta WhatsApp inbound message", () => {
  it("normalizes a text message without losing provider identity", () => {
    expect(parseMetaWhatsAppInboundMessage({ id: "wamid-text", from: "5511999999999", type: "text", text: { body: "  olá  " } })).toEqual({
      kind: "text", providerMessageId: "wamid-text", fromPhone: "+5511999999999", text: "olá",
    });
  });

  it("keeps only authorized Meta audio metadata", () => {
    expect(parseMetaWhatsAppInboundMessage({ id: "wamid-audio", from: "5511999999999", type: "audio", audio: { id: "media-123", mime_type: "audio/ogg; codecs=opus", voice: true, url: "https://untrusted.invalid/file" } })).toEqual({
      kind: "audio", providerMessageId: "wamid-audio", fromPhone: "+5511999999999",
      audio: { mediaId: "media-123", mimeType: "audio/ogg; codecs=opus", voice: true },
    });
  });

  it.each([
    null,
    {},
    { id: "x", from: "invalid", type: "audio", audio: { id: "media" } },
    { id: "x", from: "5511999999999", type: "audio", audio: {} },
    { id: "x", from: "5511999999999", type: "image", image: { id: "media" } },
  ])("rejects malformed or unsupported input %#", (input) => {
    expect(parseMetaWhatsAppInboundMessage(input)).toBeNull();
  });
});
