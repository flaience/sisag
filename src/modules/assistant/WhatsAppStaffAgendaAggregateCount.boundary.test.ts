import fs from "node:fs";
import { describe, expect, it } from "vitest";

const reader = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaReadModel.service.ts", "utf8");
const handler = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQueryHandler.service.ts", "utf8");

describe("WhatsApp staff agenda aggregate count boundary", () => {
  it("counts distinct official booking items in the database", () => {
    expect(reader).toContain("count(distinct");
    expect(reader).toContain("bookingItems.id");
    expect(reader).toContain("ACTIVE_BOOKING_STATUSES");
  });

  it("does not use the list limit for summary queries", () => {
    expect(reader).toContain('input.query.kind === "day_summary"');
    expect(reader).toContain("loadAppointmentCount(scope)");
    expect(handler).toContain("model.totalCount ?? 0");
  });

  it("keeps tenant and professional boundaries", () => {
    expect(reader).toContain("eq(bookings.companyId, input.companyId)");
    expect(reader).toContain("eq(professionals.companyId, input.companyId)");
    expect(reader).toContain("eq(professionals.id, input.professionalId)");
  });
});
