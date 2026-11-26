import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/modules/agents/n8n/N8nAgentArrivalIntentionProposalReadModel.service.ts", "utf8");
const route = fs.readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");

describe("n8n agent arrival intention proposal read model boundary", () => {
  it("loads only active arrival periods inside the trusted tenant date and capacity", () => {
    for (const value of ["services.attendanceMode", '"arrival_order"', "serviceArrivalPeriods.companyId", "input.companyId", "serviceArrivalPeriods.weekday", "arrivalIntentions.attendanceDate", 'arrivalIntentions.status, "registered"', "limit: 5", ".slice(0, 5)"]) expect(source).toContain(value);
  });
  it("passes trusted identifiers to the pure proposal and fails closed", () => {
    for (const value of ["createN8nAgentArrivalIntentionProposal", 'status: "proposal_ready"', 'status: "not_resolved"', "proposal: null"]) expect(source).toContain(value);
    expect(source).not.toContain("periodId: input");
  });
  it("exposes preparation through the read-only gateway without registering or sending", () => {
    for (const value of ["insert(arrivalIntentions)", "registerArrivalIntention", "WhatsAppSender", "checkIn", "outbox"]) expect(source).not.toContain(value);
    expect(route).toContain("return resolveN8nAgentArrivalIntentionProposalReadModel(");
  });
});
