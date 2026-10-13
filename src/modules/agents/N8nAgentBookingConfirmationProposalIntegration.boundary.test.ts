import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
const mirror = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirror.service.ts", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent booking confirmation proposal integration boundary", () => {
  it("accepts only explicit confirmation proposals with both execution gates closed", () => {
    expect(schema).toContain("awaiting_explicit_confirmation");
    expect(schema).toContain("dispatchAllowed: z.literal(false)");
    expect(schema).toContain("bookingExecutionAllowed: z.literal(false)");
  });
  it("keeps the proposal ephemeral in the mirror result", () => {
    expect(mirror).toContain("bookingConfirmationProposal: metadata.bookingConfirmationProposal ?? null");
    expect(mirror).not.toContain("executeBookingCommand");
    expect(mirror).not.toContain("OutboxPublisher");
  });
  it("does not route or execute the proposal in production yet", () => {
    expect(route).not.toContain("bookingConfirmationProposal");
    expect(route).not.toContain("createN8nAgentBookingConfirmationProposal");
  });
});
