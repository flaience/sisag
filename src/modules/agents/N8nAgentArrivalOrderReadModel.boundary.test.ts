import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("n8n agent arrival order read model boundary", () => {
  const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentArrivalOrderReadModel.service.ts", "utf8");
  it("reads active arrival-order periods within the authenticated company", () => {
    for (const value of ["serviceArrivalPeriods.companyId, companyId", 'services.attendanceMode, "arrival_order"', "serviceArrivalPeriods.active, true", "companyUnits.active, true"]) expect(service).toContain(value);
  });
  it("counts only active intentions for the concrete date", () => {
    for (const value of ["arrivalIntentions.attendanceDate, attendanceDate", 'arrivalIntentions.status, "registered"', "groupBy(arrivalIntentions.periodId)"]) expect(service).toContain(value);
  });
  it("returns at most five sanitized candidates and never mutates", () => {
    expect(service).toContain(".slice(0, 5)");
    for (const value of ["insert(", "update(", "delete(", "registerArrivalIntention", "cancelArrivalIntention"]) expect(service).not.toContain(value);
  });
});
