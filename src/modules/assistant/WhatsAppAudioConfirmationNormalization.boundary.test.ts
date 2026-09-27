import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("WhatsApp audio confirmation normalization boundary", () => {
  const assistant = fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts", "utf8");
  const dispatch = fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioTranscriptDispatch.service.ts", "utf8");

  it("sends the transcript through the same confirmation handler", () => {
    expect(dispatch).toContain("AssistantWhatsAppService.handleInbound");
    expect(dispatch).toContain("text: claimed.transcript");
    expect(assistant).toContain("normalizeYesNo(textRaw)");
  });

  it("normalizes accents and punctuation before closed-list matching", () => {
    expect(assistant).toContain('.normalize("NFD")');
    expect(assistant).toContain('.replace(/[^a-z0-9]+/g, " ")');
    expect(assistant).toContain('"nao obrigado"');
  });

  it("keeps explicit confirmation mandatory", () => {
    expect(assistant).toContain('if (textNorm !== "YES")');
    expect(assistant).toContain('if (textNorm === "NO"');
  });
});
