import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("arrival intention foundation boundary", () => {
  const schema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
  const service = fs.readFileSync("src/modules/arrival-order/ArrivalIntention.service.ts", "utf8");
  const migration = fs.readFileSync("src/drizzle/0024_arrival_intention_foundation.sql", "utf8");

  it("persists a concrete date under company period and client", () => {
    for (const value of ["companyId", "periodId", "clientId", "attendanceDate", "requestId"]) expect(schema).toContain(value);
  });

  it("serializes capacity and preserves idempotency", () => {
    expect(service).toContain('.for("update")');
    expect(service).toContain("arrivalIntentions.requestId");
    expect(migration).toContain("arrival_intentions_company_request_uq");
    expect(migration).toContain("arrival_intentions_active_client_period_uq");
  });

  it("supports registration and cancellation only", () => {
    for (const value of ["registered", "cancelled"]) expect(schema).toContain(value);
    for (const value of ["queuePosition", "checkIn", "ARRIVED", "IN_PROGRESS"]) expect(service).not.toContain(value);
  });
});
