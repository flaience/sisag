import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/api/v1/settings/whatsapp/homologation/audio/route.ts", "utf8");
const provider = readFileSync("src/modules/whatsapp/homologation/WhatsAppAudioHomologationProvider.service.ts", "utf8");

describe("WhatsApp audio homologation admin API boundary", () => {
  it("requires an authenticated administrator and bounded multipart audio", () => {
    expect(route).toContain('requireApiRole(request, ["owner", "admin"])');
    expect(route).toContain('form?.get("file")');
    expect(route).toContain("WHATSAPP_AUDIO_POLICY.maximumBytes");
    expect(route).toContain("WHATSAPP_AUDIO_POLICY.maximumDurationSeconds");
    expect(route).toContain('"cache-control": "no-store"');
  });

  it("uses a Docker Secret and returns no credentials or audio bytes", () => {
    expect(provider).toContain('readFile("/run/secrets/openai_api_key"');
    expect(provider).toContain("OpenAIAudioTranscriber");
    expect(route).not.toContain("openai_api_key");
    expect(route).not.toContain("console.");
    expect(route).not.toContain("MetaWhatsAppMediaDownloader");
  });
});
