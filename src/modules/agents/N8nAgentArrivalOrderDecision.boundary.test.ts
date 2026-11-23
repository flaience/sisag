import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("n8n agent arrival order decision boundary", () => {
  const schema = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.schema.ts", "utf8");
  const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");
  it("uses a closed decision contract for the read-only arrival tool", () => { for (const value of ["scheduling.list_arrival_periods", "ArrivalOrderArgumentsSchema", "arrival_order_availability_required", "invalid_arrival_order_arguments"]) expect(schema).toContain(value); });
  it("grounds explicit arrival intent after existing mutation-related repairs", () => {
    const arrival = service.indexOf("const explicitlyGrounded = groundN8nAgentArrivalOrderDecision");
    expect(arrival).toBeGreaterThan(-1);
    for (const value of ["groundN8nAgentBookingCancellationDecision", "groundN8nAgentBookingReschedulingDecision", "groundN8nAgentSelectedAppointmentActionDecision"]) expect(service.slice(arrival)).toContain(value);
  });
  it("keeps the decision read-only and forbids automatic registration", () => { expect(service).toContain("não registre intenção"); for (const value of ["registerArrivalIntention", "cancelArrivalIntention"]) expect(service).not.toContain(value); });
});
