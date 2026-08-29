import fs from "node:fs";
import { describe, expect, it } from "vitest";

const schema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
const migration = fs.readFileSync("infra/professional-schedules-tenant-unit-foundation.sql", "utf8");

describe("professional schedule tenant and unit foundation", () => {
  it("requires company, professional and unit ownership", () => {
    expect(schema).toContain('companyId: uuid("company_id").notNull()');
    expect(schema).toContain('unitId: uuid("unit_id").notNull()');
    expect(schema).toContain('professionalSchedules_company_professional_weekday_idx'.replace("professionalSchedules", "professional_schedules"));
    expect(schema).toContain(".enableRLS()");
  });

  it("backfills existing schedules and installs composite boundaries", () => {
    expect(migration).toContain("set company_id = p.company_id");
    expect(migration).toContain("order by pu.is_primary desc");
    expect(migration).toContain("foreign key (company_id, professional_id)");
    expect(migration).toContain("foreign key (company_id, professional_id, unit_id)");
    expect(migration).toContain("professional_schedules_time_order_check");
    expect(migration).toContain("enable row level security");
  });
});
