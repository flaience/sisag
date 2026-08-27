import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { companyUnits } from "@/drizzle/schema";

describe("company units persistence", () => {
  const config = getTableConfig(companyUnits);

  it("keeps ownership and operational identity required", () => {
    for (const name of ["company_id", "code", "name", "time_zone", "country_code", "is_default", "active"]) {
      expect(config.columns.find((column) => column.name === name)?.notNull).toBe(true);
    }
  });

  it("prevents duplicate codes and more than one default unit per company", () => {
    expect(config.indexes.map((item) => item.config.name)).toEqual(expect.arrayContaining([
      "company_units_company_code_uq",
      "company_units_company_default_uq",
      "company_units_company_active_idx",
    ]));
  });

  it("guards business fields and enables row-level security", () => {
    expect(config.checks.map((item) => item.name)).toEqual(expect.arrayContaining([
      "company_units_code_check",
      "company_units_name_check",
      "company_units_time_zone_check",
      "company_units_country_code_check",
    ]));
    expect(config.enableRLS).toBe(true);
  });
});
