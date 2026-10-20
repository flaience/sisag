import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
const mirror = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirror.service.ts", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent booking confirmation proposal integration boundary", () => {
  it("accepts only explicit confirmation proposals with both execution gates closed", () => {
    expect(schema).toContain("awaiting_explicit_confirmation");
    expect(schema).toContain("dispatchAllowed: z.boolean()");
    expect(schema).toContain("bookingExecutionAllowed: z.literal(false)");
  });
  it("keeps the proposal ephemeral in the mirror result", () => {
    expect(mirror).toContain("bookingConfirmationProposal: metadata.bookingConfirmationProposal ?? null");
    expect(mirror).not.toContain("executeBookingCommand");
    expect(mirror).not.toContain("OutboxPublisher");
  });
  it("recognizes the proposal only to suppress legacy candidate routing", () => {
    expect(route).toContain("const bookingConfirmationProposal");
    expect(route).toContain("bookingConfirmationProposal || bookingCancellationProposal || bookingReschedulingProposal ? null");
    expect(route).not.toContain("routeN8nAgentBookingConfirmationProposal");
    expect(route).not.toContain("executeN8nAgentBookingConfirmationProposal");
    expect(route).not.toContain("executeBookingCommand");
  });
});
