import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const schema = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
const routing = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationProposalRouting.service.ts", "utf8");
describe("n8n agent booking cancellation proposal integration boundary", () => {
  it("accepts only sanitized active appointment metadata", () => { expect(schema).toContain("BookingCancellationProposalSchema"); expect(schema).toContain('status: z.enum(["PENDING", "CONFIRMED"])'); expect(schema).not.toContain("clientId: z.string"); });
  it("allows question routing while cancellation execution remains closed", () => { expect(schema).toContain("dispatchAllowed: z.boolean()"); expect(schema).toContain("cancellationExecutionAllowed: z.literal(false)"); expect(routing).not.toContain("cancelAppointment"); });
});
