import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/modules/agents/n8n/N8nAgentArrivalIntentionProposal.ts", "utf8");

describe("n8n agent arrival intention proposal foundation boundary", () => {
  it("requires explicit confirmation and states the operational limitation", () => {
    for (const value of ["awaiting_explicit_confirmation", "não reserva horário nem posição na fila", "arrivalIntentionExecutionAllowed: false", "dispatchAllowed: false"]) expect(source).toContain(value);
  });
  it("does not register route send check in or expose production integration", () => {
    for (const value of ["registerArrivalIntention", "arrival-intentions/route", "WhatsAppSender", "checkIn", "outbox", "N8nAgentSharedResultRouter"]) expect(source).not.toContain(value);
  });
});
