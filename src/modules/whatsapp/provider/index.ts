import { mockWhatsAppProvider } from "./mock.provider";
import { metaWhatsAppProvider } from "./meta.provider";
import type { WhatsAppProvider } from "./types";

export function getWhatsAppProvider(): WhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER?.toLowerCase();

  switch (provider) {
    case "meta":
      return metaWhatsAppProvider;

    case "mock":
    default:
      return mockWhatsAppProvider;
  }
}
