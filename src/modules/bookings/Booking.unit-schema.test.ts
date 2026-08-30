import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("booking unit foundation", () => {
  it("keeps unit ownership mandatory in migration and schema", () => {
    const root = process.cwd();
    const sql = fs.readFileSync(path.join(root, "infra/bookings-unit-foundation.sql"), "utf8");
    const schema = fs.readFileSync(path.join(root, "src/drizzle/schema.ts"), "utf8");
    expect(sql).toContain("alter column unit_id set not null");
    expect(sql).toContain("foreign key (company_id, unit_id)");
    expect(sql).toContain("bookings_company_unit_time_idx");
    expect(schema).toContain('unitId: uuid("unit_id")');
  });
});
