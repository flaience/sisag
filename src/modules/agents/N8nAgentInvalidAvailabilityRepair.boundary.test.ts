import fs from "node:fs";
import { describe, expect, it } from "vitest";

const repair = fs.readFileSync("src/modules/agents/n8n/N8nAgentInvalidAvailabilityRepair.ts", "utf8");
const decision = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");

describe("n8n agent invalid availability repair boundary", () => {
  it("requires availability, a recognized period and one grounded catalog service", () => {
    expect(repair).toContain("isN8nAgentAvailabilityIntent");
    expect(repair).toContain("availabilityRange");
    expect(repair).toContain("groundServiceCatalogDecision");
    expect(repair).toContain('typeof grounded.toolArguments?.serviceId !== "string"');
  });

  it("uses trusted time and catalog data without writes", () => {
    for (const value of ["receivedAt", "timeZone", "serviceCatalog", "todayDateIso", "zonedDateTimeToUtcISOString"]) expect(repair).toContain(value);
    for (const forbidden of ["getDb", "insert(", "update(", "outbox", "executeBookingCommand"]) expect(repair).not.toContain(forbidden);
  });

  it("repairs only after invalid output and otherwise keeps safe clarification", () => {
    expect(decision).toContain('fallback("invalid_output"');
    expect(decision).toContain("repairInvalidAvailabilityDecision");
    expect(decision).toContain('action: "clarify" as const');
  });
});
