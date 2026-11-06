import fs from "node:fs";
import { describe, expect, it } from "vitest";

const route = fs.readFileSync("src/app/api/v1/scheduling/readiness/route.ts", "utf8");
const schema = fs.readFileSync("src/modules/scheduling-readiness/SchedulingReadinessQuery.schema.ts", "utf8");

describe("scheduling readiness admin API boundary", () => {
  it("requires an authenticated administrative role and session company", () => {
    expect(route).toContain('requireApiRole(request, ["owner", "admin"])');
    expect(route).toContain("companyId: auth.auth.companyId");
    expect(schema).not.toContain("companyId");
  });

  it("accepts only three UUID selections and exposes a no-store GET", () => {
    for (const value of ["unitId", "serviceId", "professionalId", ".uuid()", ".strict()"]) expect(schema).toContain(value);
    expect(route).toContain("export async function GET");
    expect(route).toContain('"cache-control": "no-store"');
    expect(route).not.toContain("export async function POST");
    expect(route).not.toContain("export async function PUT");
    expect(route).not.toContain("export async function DELETE");
  });
});
