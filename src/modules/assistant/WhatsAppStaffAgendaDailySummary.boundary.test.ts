import fs from "node:fs";
import { describe, expect, it } from "vitest";

const query = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.ts", "utf8");
const reader = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaReadModel.service.ts", "utf8");
const identity = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaIdentity.service.ts", "utf8");

describe("WhatsApp staff agenda daily summary boundary", () => {
  it("supports tomorrow and count without routing client booking requests", () => {
    expect(query).toContain('kind: "day_summary"');
    expect(query).toContain('export type StaffAgendaDay = "today" | "tomorrow"');
    expect(query).toContain('const day: StaffAgendaDay');
    expect(query).toContain("hasAgendaSubject");
  });

  it("uses business timezone ranges and official appointment reader", () => {
    expect(reader).toContain('query.day === "tomorrow"');
    expect(reader).toContain("zonedDateTimeToUtcISOString");
    expect(reader).toContain("loadAppointments");
  });

  it("keeps persisted identity as the authorization source", () => {
    expect(identity).toContain("loadPersistedWhatsAppStaffAccess");
    expect(identity).not.toContain("authorizedSenders");
  });
});
