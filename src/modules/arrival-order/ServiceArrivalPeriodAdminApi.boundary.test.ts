import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("service arrival period admin API boundary", () => {
  const collection = fs.readFileSync("src/app/api/v1/scheduling/arrival-periods/route.ts", "utf8");
  const item = fs.readFileSync("src/app/api/v1/scheduling/arrival-periods/[id]/route.ts", "utf8");

  it("derives company ownership from authentication", () => {
    expect(collection).toContain("auth.auth.companyId");
    expect(item).toContain("auth.auth.companyId");
    expect(collection + item).not.toContain("parsed.data.companyId");
  });

  it("allows staff to read and only owner or admin to mutate", () => {
    expect(collection).toContain('["owner", "admin", "staff"]');
    expect((collection + item).split('["owner", "admin"]').length - 1).toBe(3);
  });

  it("uses deactivation and has no queue or booking capability", () => {
    expect(item).toContain("deactivateServiceArrivalPeriod");
    for (const value of ["delete(", "queuePosition", "checkIn", "createBooking"]) expect(collection + item).not.toContain(value);
  });
});
