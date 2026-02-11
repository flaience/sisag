export type SessionStatus = "open" | "closed";

export type ConversationContext = {
  pendingIntent?: "SCHEDULE_REQUEST" | "CANCEL_REQUEST" | "RESCHEDULE_REQUEST";
  pending?: {
    dateIso?: string; // YYYY-MM-DD
    time?: string; // HH:mm
  };
};

export type ConversationSession = {
  id: string;
  companyId: string;
  clientId: string;
  status: SessionStatus;
  context: ConversationContext;
};
