import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("service arrival period foundation boundary", () => {
  const schema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
  const service = fs.readFileSync("src/modules/arrival-order/ServiceArrivalPeriod.service.ts", "utf8");
  const migration = fs.readFileSync("src/drizzle/0023_service_arrival_period_foundation.sql", "utf8");

  it("scopes every period by company unit and arrival-order service", () => {
    for (const value of ["companyId", "unitId", "serviceId", 'eq(services.attendanceMode, "arrival_order")']) expect(schema + service).toContain(value);
  });

  it("guards weekday time and optional capacity in the database", () => {
    for (const value of ["service_arrival_periods_weekday_check", "service_arrival_periods_time_check", "service_arrival_periods_capacity_check", "service_arrival_periods_exact_period_uq"]) expect(migration).toContain(value);
  });

  it("does not create appointments check-ins or queue positions", () => {
    for (const value of ["bookings", "checkIn", "queuePosition", "positionInQueue"]) expect(service).not.toContain(value);
  });
});
