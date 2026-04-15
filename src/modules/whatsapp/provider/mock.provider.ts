import type {
  WhatsAppProvider,
  SendWhatsAppParams,
  SendWhatsAppResult,
} from "./types";

export const mockWhatsAppProvider: WhatsAppProvider = {
  async sendMessage(params: SendWhatsAppParams): Promise<SendWhatsAppResult> {
    return {
      ok: true,
      providerMessageId: `mock_${Date.now()}`,
    };
  },
};
