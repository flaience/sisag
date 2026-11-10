import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("whatsapp homologation conversation context boundary", () => {
  const page = readFileSync("src/app/admin/settings/whatsapp/homologation/page.tsx", "utf8");
  const route = readFileSync("src/app/api/v1/settings/whatsapp/homologation/route.ts", "utf8");
  const composer = readFileSync("src/modules/whatsapp/homologation/WhatsAppHomologationConversationContext.ts", "utf8");

  it("keeps a short in-memory conversation in the browser", () => {
    expect(page).toContain("Conversa simulada");
    expect(page).toContain("setHistory");
    expect(page).toContain("slice(-6)");
    expect(page).toContain("Limpar conversa");
  });

  it("sends only the previous exchange and current text to the shadow decision", () => {
    expect(route).toContain("composeWhatsAppHomologationTurn");
    expect(composer).toContain("Solicitação anterior:");
    expect(composer).toContain("Continuação do cliente:");
  });

  it("does not persist or dispatch the conversation", () => {
    for (const forbidden of ["getDb", "messageLogs", "OutboxPublisher", "routeN8nAgentAnswerCandidate", "graph.facebook.com"]) expect(composer + page).not.toContain(forbidden);
  });
});
