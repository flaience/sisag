export type SendWhatsAppParams = {
  to: string;
  message: string;
};

export type SendWhatsAppResult =
  | {
      ok: true;
      providerMessageId: string | null;
    }
  | {
      ok: false;
      error: string;
    };

export interface WhatsAppProvider {
  sendMessage(params: SendWhatsAppParams): Promise<SendWhatsAppResult>;
}
