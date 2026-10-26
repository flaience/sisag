import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const page = readFileSync("src/app/politica-de-privacidade/page.tsx", "utf8");
const middleware = readFileSync("src/middleware.ts", "utf8");
describe("public privacy policy", () => {
  it("is a public indexed page with the required contact", () => { expect(page).toContain("Política de Privacidade | SISAG"); expect(page).toContain("luis@flaience.com"); expect(page).toContain("Lei Geral de Proteção de Dados Pessoais"); expect(middleware).toContain('req.nextUrl.pathname.startsWith("/admin")'); expect(middleware).not.toContain('pathname.startsWith("/politica-de-privacidade")'); });
  it("documents WhatsApp data, sharing, retention and deletion requests", () => { for (const term of ["WhatsApp", "Compartilhamento", "Armazenamento e segurança", "Solicitação de exclusão", "Não comercializamos dados pessoais"]) expect(page).toContain(term); });
  it("does not expose internal identifiers or secrets", () => { for (const forbidden of ["SUPABASE", "META_WEBHOOK", "companyId", "whatsappAccountId", "senderPhoneE164"]) expect(page).not.toContain(forbidden); });
});
