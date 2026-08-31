import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { SchedulingConfigInputSchema } from "./scheduling-config.schema";

describe("scheduling booking defaults foundation", () => {
  it("accepts optional editable defaults without breaking existing payloads", () => {
    const base = { timezone: "America/Sao_Paulo", slotDurationMinutes: 15, bufferMinutes: 5, allowOverbooking: false, maxAdvanceDays: 30, minCancelAdvanceMinutes: 0 };
    expect(SchedulingConfigInputSchema.safeParse(base).success).toBe(true);
    expect(SchedulingConfigInputSchema.safeParse({ ...base, defaultUnitId: null, defaultServiceId: null, defaultProfessionalId: null }).success).toBe(true);
  });

  it("enforces company ownership and compatible defaults in the database", () => {
    const sql = fs.readFileSync("infra/scheduling-booking-defaults.sql", "utf8");
    expect(sql).toContain("u.company_id = new.company_id");
    expect(sql).toContain("s.company_id = new.company_id");
    expect(sql).toContain("p.company_id = new.company_id");
    expect(sql).toContain("default_professional_not_available_at_unit");
    expect(sql).toContain("default_professional_does_not_perform_service");
  });
});
