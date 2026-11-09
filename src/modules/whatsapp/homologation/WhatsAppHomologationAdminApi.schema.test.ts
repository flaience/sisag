import { describe, expect, it } from "vitest";
import { WhatsAppHomologationAdminCommandSchema } from "./WhatsAppHomologationAdminApi.schema";

const valid = { whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", senderPhoneE164: "+555492056187", text: "Quero agendar uma consulta" };

describe("whatsapp homologation admin API schema", () => {
  it("accepts only the account phone and text supplied by the administrator", () => {
    expect(WhatsAppHomologationAdminCommandSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    { ...valid, companyId: "9af03377-1d22-40be-9460-dbe07b2709d5" },
    { ...valid, whatsappAccountId: "other" },
    { ...valid, senderPhoneE164: "5492056187" },
    { ...valid, text: " " },
  ])("rejects tenant injection or invalid input", (input) => {
    expect(WhatsAppHomologationAdminCommandSchema.safeParse(input).success).toBe(false);
  });
});
