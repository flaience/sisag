import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { professionalServices } from "@/drizzle/schema";
describe("professional services persistence", () => { const config = getTableConfig(professionalServices);
  it("requires ownership, relationship and lifecycle fields", () => { for (const name of ["company_id", "professional_id", "service_id", "active", "created_at", "updated_at"]) expect(config.columns.find((column) => column.name === name)?.notNull).toBe(true); });
  it("keeps overrides optional and guarded", () => { expect(config.columns.find((column) => column.name === "duration_override_minutes")?.notNull).toBe(false); expect(config.columns.find((column) => column.name === "price_override")?.notNull).toBe(false); expect(config.checks.map((item) => item.name)).toEqual(expect.arrayContaining(["professional_services_duration_check", "professional_services_price_check"])); });
  it("prevents duplicates and supports both scheduling directions", () => { expect(config.indexes.map((item) => item.config.name)).toEqual(expect.arrayContaining(["professional_services_company_professional_service_uq", "professional_services_company_professional_active_idx", "professional_services_company_service_active_idx"])); });
  it("enables row-level security", () => { expect(config.enableRLS).toBe(true); });
});
