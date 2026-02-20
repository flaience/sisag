export type WhatsAppProvider = "meta" | "zap" | "mock";

export type WhatsAppConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "restricted"
  | "error";

export type WhatsAppStatusResponse = {
  provider: WhatsAppProvider;
  connection_status: WhatsAppConnectionStatus;

  phone_number_id?: string;
  waba_id?: string;
  display_number?: string;
  display_name?: string;

  last_error?: string | null;
  last_sync_at?: string | null;
};
export type WhatsAppTestSendRequest = {
  toPhone: string; // somente dígitos, ex: 55549912330586
  text: string;
};

export type WhatsAppTestSendResponse = {
  ok: boolean;
  outbox_id?: string;
  error?: string;
};
