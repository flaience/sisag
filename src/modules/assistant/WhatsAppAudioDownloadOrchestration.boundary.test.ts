import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("WhatsApp audio download orchestration boundary", () => {
  const source = fs.readFileSync("src/modules/assistant/audio/MetaWhatsAppAudioOrchestrator.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

  it("composes the hardened downloader with the bounded transcription contract", () => {
    for (const value of ["MetaWhatsAppMediaDownloader", "transcribeAuthorizedWhatsAppAudio", "downloadByMediaId", "dependencies.transcribe"]) {
      expect(source).toContain(value);
    }
  });

  it("requires explicit credentials and dependencies without global configuration", () => {
    for (const forbidden of ["process.env", "getDb", "WHATSAPP_TOKEN", "META_ACCESS_TOKEN", "OPENAI_API_KEY"]) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).toContain("accessToken: string");
    expect(source).toContain("fetch: FetchLike");
  });

  it("does not activate network, transcription or business actions in the webhook", () => {
    expect(route).not.toContain("orchestrateMetaWhatsAppAudio");
    for (const forbidden of ["BookingService", "outbox", "MetaWhatsAppMediaDownloader"]) expect(route).not.toContain(forbidden);
  });
});
