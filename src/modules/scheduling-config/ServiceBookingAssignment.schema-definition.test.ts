import fs from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { serviceBookingAssignmentRules } from "@/drizzle/schema";

describe("service-led booking assignment foundation", () => {
  it("models service-specific and shift-wide defaults", () => {
    const config = getTableConfig(serviceBookingAssignmentRules);
    expect(config.columns.find((column) => column.name === "service_id")?.notNull).toBe(false);
    expect(config.columns.find((column) => column.name === "professional_id")?.notNull).toBe(true);
    expect(config.columns.find((column) => column.name === "unit_id")?.notNull).toBe(true);
    expect(config.indexes.map((item) => item.config.name)).toContain("service_booking_assignment_rules_resolution_idx");
  });

  it("enforces tenant ownership through composite database keys", () => {
    const sql = fs.readFileSync("infra/service-led-booking-foundation.sql", "utf8");
    expect(sql).toContain("foreign key (company_id, professional_id, unit_id)");
    expect(sql).toContain("foreign key (company_id, professional_id, service_id)");
    expect(sql).toContain("where service_id is null");
    expect(sql).toContain("enable row level security");
  });
});
