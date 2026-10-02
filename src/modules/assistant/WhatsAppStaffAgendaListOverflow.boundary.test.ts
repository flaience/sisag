import fs from "node:fs";
import { describe, expect, it } from "vitest";

const reader = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaReadModel.service.ts", "utf8");
const handler = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQueryHandler.service.ts", "utf8");

describe("WhatsApp staff agenda list overflow boundary", () => {
  it("uses the aggregate count for day lists", () => {
    expect(reader).toContain('input.query.kind === "day_agenda"');
    expect(reader).toContain("Promise.all");
    expect(reader).toContain("loadAppointmentCount(scope)");
  });

  it("keeps the detailed list bounded", () => {
    expect(reader).toContain("limit: MAX_RESULTS");
    expect(handler).toContain("slice(0, 10)");
  });

  it("computes overflow from total count rather than loaded rows", () => {
    expect(handler).toContain("model.totalCount ?? model.appointments.length");
    expect(handler).toContain("remaining === 1");
  });
});
