import fs from "node:fs";
import { describe, expect, it } from "vitest";

const query = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.ts", "utf8");
const reader = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaReadModel.service.ts", "utf8");
const handler = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQueryHandler.service.ts", "utf8");

describe("WhatsApp staff monthly agenda boundary", () => {
  it("defines explicit current, next and named month scopes", () => {
    expect(query).toContain('"this_month" | "next_month" | "specific_month"');
    expect(query).toContain("proximo mes|mes que vem");
    expect(query).toContain("MONTH_PATTERN");
  });

  it("uses one database interval for an unrestricted full month", () => {
    expect(reader).toContain('if (query.period === "full_day")');
    expect(reader).toContain("end: new Date(zonedDateTimeToUtcISOString(nextMonthDate");
  });

  it("formats localized monthly replies", () => {
    expect(handler).toContain('"deste mês"');
    expect(handler).toContain('"do próximo mês"');
    expect(handler).toContain('"janeiro", "fevereiro", "março"');
  });
});
