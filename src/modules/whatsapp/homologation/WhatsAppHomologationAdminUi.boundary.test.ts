import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("whatsapp homologation admin UI boundary", () => {
  const page = readFileSync("src/app/admin/settings/whatsapp/homologation/page.tsx", "utf8");
  const settings = readFileSync("src/app/admin/settings/whatsapp/page.tsx", "utf8");
  const route = readFileSync("src/app/api/v1/settings/whatsapp/homologation/route.ts", "utf8");

  it("is reachable from WhatsApp settings and explains the safety boundary", () => {
    expect(settings).toContain('/admin/settings/whatsapp/homologation');
    expect(page).toContain("Nenhuma resposta será enviada ao WhatsApp");
    expect(page).toContain("nenhuma proposta será executada");
  });

  it("shows decision tool reason and candidate without a send action", () => {
    for (const value of ["Decisão", "Ferramenta", "Motivo", "Resposta que seria apresentada"]) expect(page).toContain(value);
    for (const forbidden of ["Enviar ao WhatsApp", "Confirmar proposta", "Executar proposta"]) expect(page).not.toContain(forbidden);
  });

  it("derives the homologation identity from the authenticated company without Meta accounts", () => {
    expect(route).toContain("companyId: auth.auth.companyId");
    expect(route).toContain("whatsappAccountId: auth.auth.companyId");
    expect(route).not.toContain("whatsappAccounts");
    expect(route).not.toContain("providerConfig");
  });
});
