import fs from "node:fs";
import { describe, expect, it } from "vitest";

const service = fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts", "utf8");
const sessionTypes = fs.readFileSync("src/modules/assistant/whatsapp-core/sessions/types.ts", "utf8");
const lifecycle = fs.readFileSync("src/modules/bookings/WhatsAppBookingLifecycle.service.ts", "utf8");

describe("WhatsApp booking management confirmation", () => {
  it("keeps booking lookup tenant and client scoped", () => {
    expect(lifecycle).toContain("eq(bookings.companyId, input.companyId)");
    expect(lifecycle).toContain("eq(bookings.clientId, input.clientId)");
    expect(lifecycle).toContain('["PENDING", "CONFIRMED"]');
  });

  it("stores a proposed reschedule without executing it", () => {
    expect(sessionTypes).toContain('"CONFIRM"');
    expect(service).toContain('mode: "CONFIRM"');
    expect(service).toContain("Posso confirmar o reagendamento");
    const proposalStart = service.indexOf("// A nova data nunca altera o booking sem confirmação explícita.");
    const proposalEnd = service.indexOf("return await publishReply", proposalStart);
    expect(service.slice(proposalStart, proposalEnd)).not.toContain("WhatsAppBookingLifecycleService.reschedule");
  });

  it("executes only after YES and declines without mutation", () => {
    const confirmationStart = service.indexOf('if (pr.mode === "CONFIRM")');
    const interpretationStart = service.indexOf("// interpreta mensagem atual", confirmationStart);
    const confirmation = service.slice(confirmationStart, interpretationStart);
    expect(confirmation).toContain('textNorm === "NO"');
    expect(confirmation).toContain('textNorm !== "YES"');
    expect(confirmation).toContain("WhatsAppBookingLifecycleService.reschedule");
    expect(confirmation).toContain("Tudo bem — não alterei o agendamento.");
  });
});
