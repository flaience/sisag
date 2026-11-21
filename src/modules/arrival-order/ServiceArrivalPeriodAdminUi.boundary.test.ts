import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("service arrival period admin UI boundary", () => {
  const page = fs.readFileSync("src/app/admin/settings/arrival-periods/page.tsx", "utf8");
  const settings = fs.readFileSync("src/app/admin/settings/page.tsx", "utf8");

  it("is reachable from settings and loads tenant-scoped references", () => {
    expect(settings).toContain('/admin/settings/arrival-periods');
    for (const value of ["/api/v1/me/company/units", "/api/v1/services?status=active", "/api/v1/scheduling/arrival-periods?status=active"]) expect(page).toContain(value);
  });

  it("shows only services configured for arrival order", () => {
    expect(page).toContain('item.attendanceMode === "arrival_order"');
    expect(page).toContain("Serviço por ordem de chegada");
  });

  it("explains capacity without assigning a queue position", () => {
    expect(page).toContain("A posição na fila será definida somente quando o cliente fizer check-in");
    expect(page).toContain("Deixe vazio para não limitar registros antecipados");
    for (const value of ["queuePosition", "positionInQueue", "createBooking"]) expect(page).not.toContain(value);
  });

  it("uses the administrative API for create update and deactivation", () => {
    expect(page).toContain('method: editingId ? "PUT" : "POST"');
    expect(page).toContain('method: "DELETE"');
  });
});
