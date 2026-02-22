// STATUS
export type WhatsAppStatusResponse = {
  provider: string;
  connection_status: "connected" | "disconnected" | "error" | "restricted";
  last_error?: string | null;
  last_sync_at?: string | null;

  // opcional (caso esteja usando)
  display_number?: string | null;
  phone_number_id?: string | null;
  waba_id?: string | null;
};

// TEST SEND
export type WhatsAppTestSendRequest = {
  toPhone: string;
  text: string;
};

export type WhatsAppTestSendResponse =
  | { ok: true; outbox_id: string }
  | { ok: false; error: string };

// LOGS
export type WhatsAppLogItem = {
  outbox_id: string;
  created_at: string;
  status: "pending" | "processing" | "sent" | "failed" | "retrying" | "dead";
  attempts: number;
  last_error?: string | null;

  to_phone?: string | null;
  text_preview?: string | null;
  provider_message_id?: string | null;
};

export type WhatsAppLogsResponse = {
  items: WhatsAppLogItem[];
  next_cursor?: string | null;
};
