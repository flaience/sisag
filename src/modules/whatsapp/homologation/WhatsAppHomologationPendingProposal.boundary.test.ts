import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("whatsapp homologation pending proposal boundary", () => {
  const resolver = readFileSync("src/modules/whatsapp/homologation/WhatsAppHomologationPendingProposal.ts", "utf8");
  const page = readFileSync("src/app/admin/settings/whatsapp/homologation/page.tsx", "utf8");

  it("intercepts exact yes or no only while a proposal is pending", () => {
    expect(resolver).toContain('answer === "sim"');
    expect(resolver).toContain('answer === "nao"');
    expect(page).toContain("resolveWhatsAppHomologationPendingProposal");
    expect(page).toContain("result?.bookingConfirmationProposal");
  });

  it("keeps the preview in memory without transport storage or mutation", () => {
    expect(page).toContain("setHistory");
    for (const forbidden of ["fetch(", "getDb", "OutboxPublisher", "routeN8nAgentBookingConfirmationDecision", "graph.facebook.com"]) expect(resolver).not.toContain(forbidden);
  });
});
