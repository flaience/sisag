//src/modules/assistant/whatsapp-core/inbound/normalizeInbound.ts
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import type { InboundWhatsAppNormalized } from "./types";

export function normalizeInbound(payload: any): InboundWhatsAppNormalized {
  const companyId = payload.companyId || payload.company_id;
  const fromPhone = payload.fromPhone || payload.from_phone || payload.from;
  const text =
    payload.text ||
    payload.message_text ||
    payload.message ||
    payload.body ||
    "";

  if (!companyId) throw new Error("missing_company_id");
  if (!fromPhone) throw new Error("missing_from_phone");
  if (!text) throw new Error("missing_text");

  return {
    companyId: String(companyId),
    fromPhoneE164: normalizePhoneE164(String(fromPhone)),
    fromName: payload.fromName || payload.profileName || payload.name || null,
    text: String(text).trim(),
    messageId: payload.messageId || payload.message_id || null,
    receivedAt: new Date(),
    raw: payload,
  };
}
