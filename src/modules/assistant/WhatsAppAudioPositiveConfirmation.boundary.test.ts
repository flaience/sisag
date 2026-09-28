import fs from "node:fs";
import { describe, expect, it } from "vitest";

const assistant = fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts", "utf8");

describe("WhatsApp audio positive confirmation boundary", () => {
  it("accepts the isolated Spanish-accented transcription emitted for Portuguese sim", () => {
    expect(assistant).toContain('["sim", "si", "s", "yes"');
  });

  it("keeps confirmation matching on an exact closed list", () => {
    expect(assistant).toContain(".includes(normalized)");
    expect(assistant).not.toContain('normalized.includes("si")');
    expect(assistant).not.toContain('normalized.startsWith("si")');
  });
});
