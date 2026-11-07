import fs from "node:fs";
import { describe, expect, it } from "vitest";
const route = fs.readFileSync("src/app/api/v1/scheduling/readiness/specific-time/route.ts", "utf8");
const schema = fs.readFileSync("src/modules/scheduling-readiness/SchedulingReadinessSpecificTimeQuery.schema.ts", "utf8");
describe("scheduling readiness specific time admin API boundary", () => {
  it("requires an administrative session and derives its company", () => { expect(route).toContain('requireApiRole(request, ["owner", "admin"])'); expect(route).toContain("companyId: auth.auth.companyId"); expect(schema).not.toContain("companyId"); });
  it("accepts only identifiers date and time", () => { for (const value of ["unitId", "serviceId", "professionalId", "date", "time", ".uuid()", ".strict()"]) expect(schema).toContain(value); expect(route).toContain("invalid_specific_time_query"); });
  it("exposes only a no-store GET", () => { expect(route).toContain("export async function GET"); expect(route).toContain('"cache-control": "no-store"'); for (const method of ["POST", "PUT", "PATCH", "DELETE"]) expect(route).not.toContain("export async function " + method); });
});
