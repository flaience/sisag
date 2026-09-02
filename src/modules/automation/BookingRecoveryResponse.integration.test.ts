import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("assistant recovery response integration", () => {
  it("handles recovery before feedback, reminders and the following generic intent", () => {
    const source = fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts", "utf8");
    const recovery = source.indexOf("BookingRecoveryResponseService.handle");
    const feedback = source.indexOf("BookingFollowupFeedbackService.handle", recovery);
    const reminder = source.indexOf("BookingReminderResponseService.handle", feedback);
    const generic = source.indexOf("interpretMessage(textRaw", reminder);
    expect(recovery).toBeGreaterThan(0);
    expect(feedback).toBeGreaterThan(recovery);
    expect(reminder).toBeGreaterThan(feedback);
    expect(generic).toBeGreaterThan(reminder);
    expect(source).toContain("recoveryResponse.handled");
  });
});
