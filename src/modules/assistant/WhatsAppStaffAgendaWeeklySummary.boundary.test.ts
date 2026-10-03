import fs from "node:fs";
import { describe, expect, it } from "vitest";

const query = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.ts", "utf8");
const reader = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaReadModel.service.ts", "utf8");
const handler = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQueryHandler.service.ts", "utf8");

describe("WhatsApp staff weekly agenda boundary", () => {
  it("defines explicit weekly scopes", () => {
    expect(query).toContain('"this_week" | "next_week"');
    expect(query).toContain("proxima semana|semana que vem");
    expect(query).toContain("esta semana|nessa semana|semana atual");
  });

  it("evaluates periods per business day instead of one continuous afternoon", () => {
    expect(reader).toContain("dates.map((dateIso) => makeDayRange");
    expect(reader).toContain("Promise.all(scopes.map");
  });

  it("keeps localized weekly replies", () => {
    expect(handler).toContain('"desta semana"');
    expect(handler).toContain('"da próxima semana"');
  });
});
