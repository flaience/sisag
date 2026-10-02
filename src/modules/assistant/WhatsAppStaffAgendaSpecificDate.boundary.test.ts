import fs from "node:fs";
import { describe, expect, it } from "vitest";

const query = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.ts", "utf8");
const reader = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaReadModel.service.ts", "utf8");
const handler = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQueryHandler.service.ts", "utf8");

describe("WhatsApp staff agenda specific date boundary", () => {
  it("reuses the approved Portuguese date parser", () => {
    expect(reader).toContain("parseSpokenDate");
    expect(reader).toContain("now, timeZone");
  });

  it("requires an administrative agenda subject", () => {
    expect(query).toContain("hasAgendaSubject");
    expect(query).toContain("hasSpecificDate");
  });

  it("shows the resolved date in the response", () => {
    expect(handler).toContain("dateLabel(model.dateIso)");
    expect(handler).toContain('model.day === "specific"');
  });

  it("fails closed when a marked date cannot be resolved", () => {
    expect(reader).toContain("invalid_staff_agenda_date");
  });
});
