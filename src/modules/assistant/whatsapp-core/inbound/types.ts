export type InboundWhatsAppNormalized = {
  companyId: string;
  fromPhoneE164: string;
  fromName?: string | null;
  text: string;
  messageId?: string | null;
  receivedAt: Date;
  raw: unknown;
};
