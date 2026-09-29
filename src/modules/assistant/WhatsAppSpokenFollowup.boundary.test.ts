import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/modules/assistant/whatsapp-core/interpreter/interpretMessage.ts", "utf8");

describe("WhatsApp spoken scheduling follow-up boundary", () => {
  it("supports Portuguese spoken days only when introduced as a day", () => {
    expect(source).toContain("SPOKEN_DAYS");
    expect(source).toContain('new RegExp("\\\\bdia');
  });

  it("allows standalone temporal follow-ups to reach slot extraction", () => {
    expect(source).toContain("parseSpokenDate(t, now, timeZone) !== undefined");
    expect(source).toContain("parseSpokenTime(t) !== undefined");
  });
});
