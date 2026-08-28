import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { professionalUnits } from "@/drizzle/schema";

describe("professional units persistence", () => {
  const config = getTableConfig(professionalUnits);
  it("requires company, professional, unit and lifecycle fields", () => {
    for (const name of ["company_id", "professional_id", "unit_id", "is_primary", "active", "created_at", "updated_at"]) expect(config.columns.find((column) => column.name === name)?.notNull).toBe(true);
  });
  it("prevents duplicate and multiple primary links", () => {
    expect(config.indexes.map((item) => item.config.name)).toEqual(expect.arrayContaining(["professional_units_company_professional_unit_uq", "professional_units_company_professional_primary_uq", "professional_units_company_unit_active_idx", "professional_units_company_professional_active_idx"]));
  });
  it("enables row-level security", () => { expect(config.enableRLS).toBe(true); });
});
