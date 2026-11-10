import { describe, expect, it } from "vitest";
import { WhatsAppHomologationAdminCommandSchema } from "./WhatsAppHomologationAdminApi.schema";

const valid = { senderPhoneE164: "+555492056187", text: "Quero agendar uma consulta" };

describe("whatsapp homologation admin API schema", () => {
  it("accepts only the simulated phone and text", () => {
    expect(WhatsAppHomologationAdminCommandSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    { ...valid, companyId: "9af03377-1d22-40be-9460-dbe07b2709d5" },
    { ...valid, whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b" },
    { ...valid, senderPhoneE164: "5492056187" },
    { ...valid, text: " " },
  ])("rejects identity injection or invalid input", (input) => {
    expect(WhatsAppHomologationAdminCommandSchema.safeParse(input).success).toBe(false);
  });
});
