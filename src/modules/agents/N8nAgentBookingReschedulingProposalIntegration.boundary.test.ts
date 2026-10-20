import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
const mirror = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirror.service.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent booking rescheduling proposal integration boundary", () => {
  it("accepts only sanitized trusted rescheduling metadata", () => {
    expect(schema).toContain("BookingReschedulingProposalSchema");
    expect(schema).toContain("dispatchAllowed: z.boolean()");
    expect(schema).toContain("reschedulingExecutionAllowed: z.literal(false)");
    expect(schema).toContain("newStartTime: z.string().datetime()");
  });

  it("preserves the proposal in the mirror result", () => {
    expect(mirror).toContain("bookingReschedulingProposal: metadata.bookingReschedulingProposal ?? null");
  });

  it("routes only the explicit question and does not execute rescheduling", () => {
    expect(webhook).toContain("bookingReschedulingProposal");
    expect(webhook).toContain("routeN8nAgentBookingReschedulingProposal");
    expect(webhook).not.toContain("executeN8nAgentBookingRescheduling");
  });
});
