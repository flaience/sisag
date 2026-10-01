import fs from "node:fs";
import { describe,expect,it } from "vitest";
const doc=fs.readFileSync("docs/whatsapp-staff-access-production-validation.md","utf8"),readme=fs.readFileSync("README.md","utf8"),plan=fs.readFileSync("docs/SISAG-plano-execucao-IA.md","utf8"),handoff=fs.readFileSync("docs/ai-development-handoff.md","utf8");
describe("WhatsApp staff access production documentation",()=>{
 it("records active, inactive and reactivated behavior",()=>{for(const value of ["Gestor","desativado","reativado","resposta neutra"])expect(doc).toContain(value)});
 it("separates provider credit exhaustion from authorization",()=>{for(const value of ["credit_balance_exhausted","HTTP 429","HTTP 200","transcription_failed"])expect(doc).toContain(value)});
 it("records the completed legacy fallback retirement",()=>{expect(doc).toContain("O fallback foi aposentado no PR #472");expect(doc).toContain("consulta exclusivamente");expect(doc).toContain("auditoria")});
 it("links the canonical record from continuity documents",()=>{for(const source of [readme,plan,handoff])expect(source).toContain("whatsapp-staff-access-production-validation.md")});
});
