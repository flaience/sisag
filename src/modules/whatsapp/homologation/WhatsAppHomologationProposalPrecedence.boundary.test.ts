import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("whatsapp homologation proposal precedence boundary", () => {
  const page = readFileSync("src/app/admin/settings/whatsapp/homologation/page.tsx", "utf8");

  it("presents a safe proposal before the availability candidate", () => {
    const presented = page.indexOf("const presented = body.bookingConfirmationProposal?.text");
    const response = page.indexOf("const responseText = result?.bookingConfirmationProposal?.text");
    expect(presented).toBeGreaterThan(-1);
    expect(response).toBeGreaterThan(-1);
    expect(page).toContain("Proposta que seria apresentada");
  });

  it("does not add confirmation dispatch or execution", () => {
    for (const forbidden of ["Confirmar proposta", "Executar proposta", "routeN8nAgentBookingProposal", "OutboxPublisher", "graph.facebook.com"]) expect(page).not.toContain(forbidden);
  });
});
