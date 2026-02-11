// src/modules/assistant/AssistantWhatsApp.service.ts
import { OutboxPublisher } from "@/infra/outbox/OutboxPublisher";
import { MessageComposer } from "./whatsapp-core/composer/MessageComposer";
import { interpretMessage } from "./whatsapp-core/interpreter/interpretMessage";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";

import { ClientResolverService } from "@/modules/clients/ClientResolver.service";

export class AssistantWhatsAppService {
  static async handleInbound(input: {
    phone: string;
    text: string;
    companyId?: string;
    correlationId?: string;
  }) {
    const companyId = input.companyId || process.env.DEFAULT_COMPANY_ID || "";
    if (!companyId) {
      return {
        ok: false,
        error: "missing_company_id",
        message:
          "Env DEFAULT_COMPANY_ID não definido e companyId não veio no body.",
      };
    }

    const fromPhoneE164 = normalizePhoneE164(input.phone);
    const text = (input.text || "").trim();

    const clientResolver = new ClientResolverService();
    const client = await clientResolver.resolveOrCreate({
      companyId,
      phoneE164: fromPhoneE164,
      name: null,
    });

    const composer = new MessageComposer();
    const interpreted = interpretMessage(text, new Date());

    let replyText = "";
    switch (interpreted.intent) {
      case "HELP":
        replyText = composer.help();
        break;
      case "CANCEL_REQUEST":
        replyText = composer.cancelAck();
        break;
      case "SCHEDULE_REQUEST":
        replyText =
          interpreted.slots.dateIso && interpreted.slots.time
            ? composer.scheduleAck()
            : composer.askMissingDateTime();
        break;
      default:
        replyText = composer.unknown();
        break;
    }

    // ✅ agora no formato exato do OutboxEvent
    await OutboxPublisher.publish({
      aggregateType: "whatsapp_message",
      aggregateId: crypto.randomUUID(), // id do “pedido de envio”
      eventType: "whatsapp.send.requested",
      payload: {
        companyId,
        toPhone: fromPhoneE164,
        text: replyText,
        clientId: client?.id ?? null,
        correlationId: input.correlationId ?? null,
        meta: { source: "api", emittedAt: new Date().toISOString() },
      },
      status: "pending",
    });

    return { ok: true };
  }
}
