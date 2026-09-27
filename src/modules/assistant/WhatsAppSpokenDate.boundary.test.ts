import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("WhatsApp spoken date boundary", () => {
  const source = fs.readFileSync("src/modules/assistant/whatsapp-core/interpreter/interpretMessage.ts", "utf8");

  it("uses the explicit company timezone and reference instant", () => {
    expect(source).toContain("parseSpokenDate(t, now, timeZone)");
    expect(source).toContain("todayDateIso(timeZone, now)");
  });

  it("keeps date interpretation deterministic and offline", () => {
    expect(source).toContain("SPOKEN_WEEKDAYS");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("OpenAI");
  });

  it("requires explicit date language", () => {
    expect(source).toContain("dia\\s+");
    expect(source).toContain("proxim[ao]");
  });
});
