import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeYesNo } from "./AssistantWhatsApp.service";

describe("WhatsApp audio positive Sín normalization", () => {
  it("accepts the exact production transcript", () => {
    expect(normalizeYesNo("Sín")).toBe("YES");
  });

  it("keeps ambiguous confirmations rejected", () => {
    for (const value of ["sinopse", "sinto muito", "sim ou não", "talvez"]) {
      expect(normalizeYesNo(value)).toBe("OTHER");
    }
  });

  it("keeps the accepted vocabulary explicit", () => {
    const source = fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts", "utf8");
    expect(source).toContain('"si", "sin", "s"');
  });
});
