import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("n8n agent arrival order answer candidate boundary", () => {
  const candidate = fs.readFileSync("src/modules/agents/n8n/N8nAgentArrivalOrderAnswerCandidate.ts", "utf8");
  const schema = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
  const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
  it("returns only service unit date period and remaining capacity", () => { for (const value of ["serviceName", "unitName", "attendanceDate", "startTime", "endTime", "remaining"]) expect(candidate).toContain(value); });
  it("has a bounded sanitized mirror contract", () => { for (const value of ["arrival_order_availability", "periodCount", "max(5)", "max(500)"]) expect(schema).toContain(value); });
  it("does not expose identities mutate or route to production yet", () => {
    for (const value of ["clientId", "requestId", "periodId", "registerArrivalIntention", "cancelArrivalIntention", "publish"]) expect(candidate).not.toContain(value);
    expect(routing).not.toContain('candidate.kind !== "arrival_order_availability"');
  });
});
