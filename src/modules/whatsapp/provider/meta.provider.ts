import type {
  WhatsAppProvider,
  SendWhatsAppParams,
  SendWhatsAppResult,
} from "./types";

const META_API_VERSION = process.env.META_API_VERSION ?? "v23.0";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export const metaWhatsAppProvider: WhatsAppProvider = {
  async sendMessage(params: SendWhatsAppParams): Promise<SendWhatsAppResult> {
    if (!META_ACCESS_TOKEN) {
      return {
        ok: false,
        error: "META_ACCESS_TOKEN não configurado.",
      };
    }

    if (!META_PHONE_NUMBER_ID) {
      return {
        ok: false,
        error: "META_PHONE_NUMBER_ID não configurado.",
      };
    }

    const to = normalizePhone(params.to);

    if (!to) {
      return {
        ok: false,
        error: "Telefone do destinatário inválido.",
      };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${META_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: {
              preview_url: false,
              body: params.message,
            },
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          ok: false,
          error:
            data?.error?.message ??
            "Erro ao enviar mensagem pela Meta Cloud API.",
        };
      }

      const providerMessageId =
        data?.messages?.[0]?.id ?? data?.messages?.[0]?.message_id ?? null;

      return {
        ok: true,
        providerMessageId,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message ?? "Erro inesperado ao enviar pela Meta.",
      };
    }
  },
};
