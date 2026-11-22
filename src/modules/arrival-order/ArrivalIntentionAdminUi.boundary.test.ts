import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("arrival intention admin UI boundary", () => {
  const page = fs.readFileSync("src/app/admin/settings/arrival-intentions/page.tsx", "utf8");
  const settings = fs.readFileSync("src/app/admin/settings/page.tsx", "utf8");
  it("is reachable and loads only tenant-scoped APIs", () => {
    expect(settings).toContain('/admin/settings/arrival-intentions');
    for (const value of ["/api/v1/people", "/api/v1/scheduling/arrival-periods?status=active", "/api/v1/scheduling/arrival-intentions?status=registered&attendanceDate="]) expect(page).toContain(value);
    expect(page).not.toContain("companyId=");
  });
  it("registers by concrete date client and period", () => {
    for (const value of ["clientId, periodId, attendanceDate", 'requestId: "admin:" + crypto.randomUUID()']) expect(page).toContain(value);
  });
  it("supports cancellation without queue or check-in operations", () => {
    expect(page).toContain('method: "DELETE"');
    expect(page).toContain("sem horário reservado");
    for (const value of ["queuePosition", "callNext", "checkIn", "createBooking"]) expect(page).not.toContain(value);
  });
});
