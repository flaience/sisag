import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/modules/assistant/whatsapp-core/interpreter/interpretMessage.ts", "utf8");

describe("WhatsApp reschedule intent boundary", () => {
  it("checks rescheduling before generic scheduling", () => {
    const reschedule = source.indexOf('intent: "RESCHEDULE_REQUEST"');
    const schedule = source.indexOf('intent: "SCHEDULE_REQUEST"');
    expect(reschedule).toBeGreaterThan(-1);
    expect(schedule).toBeGreaterThan(reschedule);
  });

  it("covers direct and conversational reschedule vocabulary", () => {
    expect(source).toContain("remarcar|remarca|reagendar|reagenda");
    expect(source).toContain("mudar|alterar|trocar");
  });
});
