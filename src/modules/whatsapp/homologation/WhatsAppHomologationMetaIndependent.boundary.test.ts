import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("whatsapp homologation Meta-independent boundary", () => {
  const page = readFileSync("src/app/admin/settings/whatsapp/homologation/page.tsx", "utf8");
  const route = readFileSync("src/app/api/v1/settings/whatsapp/homologation/route.ts", "utf8");

  it("does not require a Meta account or phone number identifier", () => {
    expect(page).toContain("Nenhuma conta da Meta é necessária");
    expect(page).not.toContain("Conta de WhatsApp");
    expect(route).not.toContain("phoneNumberId");
    expect(route).not.toContain("providerConfig");
  });

  it("keeps the simulated customer phone and text only", () => {
    expect(page).toContain("Telefone simulado do cliente");
    expect(page).toContain("Mensagem");
  });
});
