import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("service attendance mode foundation boundary", () => {
  const schema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
  const migration = fs.readFileSync("src/drizzle/0022_service_attendance_mode_foundation.sql", "utf8");
  const catalog = fs.readFileSync("src/modules/services/ServiceCatalog.service.ts", "utf8");
  const page = fs.readFileSync("src/app/admin/services/page.tsx", "utf8");

  it("keeps every existing service on exact-time scheduling", () => {
    expect(schema).toContain('default("scheduled_time")');
    expect(migration).toContain("DEFAULT 'scheduled_time' NOT NULL");
  });

  it("persists and exposes only the two initial attendance modes", () => {
    for (const value of ["scheduled_time", "arrival_order", "attendanceMode: input.attendanceMode", "attendanceMode: row.attendanceMode"]) expect(schema + catalog).toContain(value);
  });

  it("lets the administrator choose the mode without assigning a queue position", () => {
    expect(page).toContain("Forma de atendimento");
    expect(page).toContain("Ordem de chegada");
    expect(page).toContain("posição será definida apenas no check-in");
    expect(page).not.toContain("queuePosition");
  });
});
