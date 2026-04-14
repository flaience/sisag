export type WhatsAppSendRequestedPayload = {
  bookingId: string;
  companyId: string;
  clientId: string | null;
  toPhone: string;
  message: string;
  origin: "journey_suggested" | "journey_pre" | "journey_post" | "automation";
  templateKey?: string | null;
  metadata?: Record<string, unknown> | null;
};
