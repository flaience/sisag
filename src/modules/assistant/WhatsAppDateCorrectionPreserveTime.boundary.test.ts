import fs from "node:fs";
import { describe, expect, it } from "vitest";

const assistant = fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts", "utf8");

describe("WhatsApp date correction preserves time", () => {
  it("processes a complete corrected date and time in the same turn", () => {
    const correction = assistant.slice(assistant.indexOf("const correctedDateIso"), assistant.indexOf('if (textNorm === "YES"'));
    expect(correction).toContain("const correctedTime = correction.slots.time");
    expect(correction).toContain("listServiceLedAvailability");
    expect(correction).toContain("pendingBookingDraft");
    expect(correction).toContain("Posso confirmar este agendamento?");
  });

  it("asks for a time only when the correction omitted it", () => {
    expect(assistant).toContain("if (!correctedTime)");
    expect(assistant).toContain("Qual horário você prefere?");
  });
});
