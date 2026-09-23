// src/modules/assistant/whatsapp-core/sessions/types.ts

export type ConversationContext = {
  pendingIntent?: "SCHEDULE_REQUEST" | "CANCEL_REQUEST" | "RESCHEDULE_REQUEST";

  pending?: {
    dateIso?: string; // YYYY-MM-DD
    time?: string; // HH:mm
  };

  pendingBookingOptions?: {
    unitId: string;
    serviceId: string;
    dateIso: string;
    timezone: string;
    expiresAt: number;
    options: Array<{ startTime: string; professionalId: string; professionalName: string }>;
  };

  pendingBookingDraft?: {
    submittedAt?: number;
    expiresAt?: number;
    unitId: string;
    serviceId: string;
    professionalId: string;
    professionalName: string;
    dateIso: string;
    time: string;
    startTime: string;
    requestId: string;
  };

  pendingCancel?: {
    mode: "SINGLE" | "CHOOSE";
    options: Array<{
      bookingId: string;
      scheduledTimeUtc: string;
    }>;
    chosenBookingId?: string | null;
  };

  // Reagendamento em andamento
  pendingReschedule?: {
    mode: "SINGLE" | "CHOOSE";
    options: Array<{
      bookingId: string;
      scheduledTimeUtc: string;
    }>;
    chosenBookingId?: string | null;

    // nova data/hora (local, antes de converter pra UTC)
    pendingNew?: {
      dateIso?: string; // YYYY-MM-DD
      time?: string; // HH:mm
    };
  };
};
