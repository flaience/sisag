import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaReadModel.service.ts", "utf8");
const assistant = fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts", "utf8");

describe("WhatsApp staff agenda read model boundary", () => {
  it("always scopes official bookings by company and active status", () => {
    expect(source).toContain("eq(bookings.companyId, input.companyId)");
    expect(source).toContain('const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED"]');
  });

  it("scopes a professional identity in the database query", () => {
    expect(source).toContain("eq(professionals.id, input.professionalId)");
    expect(source).toContain("eq(professionals.companyId, input.companyId)");
  });

  it("is read-only", () => {
    expect(source).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });

  it("does not activate the WhatsApp response before authorization is configured", () => {
    expect(assistant).not.toContain("readWhatsAppStaffAgenda");
  });
});
