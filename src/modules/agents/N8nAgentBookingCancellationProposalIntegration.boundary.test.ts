import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
const mirror = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirror.service.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent booking cancellation proposal integration boundary", () => {
  it("accepts only sanitized future active appointment metadata", () => {
    expect(schema).toContain("BookingCancellationProposalSchema");
    expect(schema).toContain('status: z.enum(["PENDING", "CONFIRMED"])');
    expect(schema).not.toContain("clientId: z.string");
  });

  it("keeps both cancellation gates closed", () => {
    expect(schema).toContain("dispatchAllowed: z.literal(false)");
    expect(schema).toContain("cancellationExecutionAllowed: z.literal(false)");
  });

  it("returns the proposal ephemerally without production routing", () => {
    expect(mirror).toContain("bookingCancellationProposal: metadata.bookingCancellationProposal ?? null");
    expect(mirror).not.toContain("cancelAppointment");
    expect(webhook).not.toContain("bookingCancellationProposal");
  });
});
