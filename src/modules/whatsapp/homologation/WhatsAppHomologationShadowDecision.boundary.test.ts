import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("whatsapp homologation shadow decision boundary", () => {
  const source = readFileSync("src/modules/whatsapp/homologation/WhatsAppHomologationShadowDecision.service.ts", "utf8");

  it("reuses the production shadow mirror but never routes its output", () => {
    expect(source).toContain("mirrorN8nAgentShadowMessage");
    expect(source).toContain("externalDispatchAllowed: false");
    for (const forbidden of ["routeN8nAgentAnswerCandidate", "routeN8nAgentBookingProposal", "OutboxPublisher", "sendMessage", "getDb"]) expect(source).not.toContain(forbidden);
  });

  it("returns only inspectable decision artifacts", () => {
    for (const field of ["decision", "execution", "toolObservation", "answerCandidate", "bookingConfirmationProposal", "bookingCancellationProposal", "bookingReschedulingProposal"]) expect(source).toContain(field);
  });
});
