import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("WhatsApp audio transcription adapter boundary", () => {
  const source = fs.readFileSync("src/modules/assistant/audio/OpenAIAudioTranscriber.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

  it("uses one fixed HTTPS endpoint and multipart provider contract", () => {
    for (const value of ["https://api.openai.com/v1/audio/transcriptions", "FormData", "Blob", 'form.set("model"', 'form.set("language"']) expect(source).toContain(value);
    expect(source).toContain('redirect: "error"');
  });

  it("requires injected secrets and transport without reading global configuration", () => {
    expect(source).toContain("apiKey: string");
    for (const forbidden of ["process.env", "getDb", "localStorage", "console."]) expect(source).not.toContain(forbidden);
  });

  it("remains disconnected from webhook and business execution", () => {
    expect(route).not.toContain("OpenAIAudioTranscriber");
    for (const forbidden of ["BookingService", "outbox", "AssistantWhatsAppService"]) expect(source).not.toContain(forbidden);
  });
});
