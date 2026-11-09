import { describe, expect, it } from "vitest";
import { createWhatsAppHomologationEnvelope } from "./WhatsAppHomologation";

const valid = {
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b",
  senderPhoneE164: "+555492056187",
  text: "Quero marcar uma consulta",
  correlationId: "homolog:message:1",
};

describe("whatsapp homologation foundation", () => {
  it("creates an internal envelope with external dispatch denied", () => {
    expect(createWhatsAppHomologationEnvelope(valid)).toEqual({
      mode: "homologation",
      transport: "internal",
      externalDispatchAllowed: false,
      message: valid,
    });
  });

  it.each([
    { ...valid, companyId: "other-company" },
    { ...valid, whatsappAccountId: "other-account" },
    { ...valid, senderPhoneE164: "5492056187" },
    { ...valid, text: " " },
    { ...valid, correlationId: "wamid.external" },
    { ...valid, extra: true },
  ])("fails closed for an invalid or expanded contract", (input) => {
    expect(createWhatsAppHomologationEnvelope(input)).toBeNull();
  });
});
