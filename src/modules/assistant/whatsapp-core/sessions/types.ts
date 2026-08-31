// src/modules/assistant/whatsapp-core/sessions/types.ts

export type ConversationContext = {
  pendingIntent?: "SCHEDULE_REQUEST" | "CANCEL_REQUEST" | "RESCHEDULE_REQUEST";

  pending?: {
    dateIso?: string; // YYYY-MM-DD
    time?: string; // HH:mm
  };

  pendingBookingDraft?: {
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
      appointmentId: string;
      scheduledTimeUtc: string;
    }>;
    chosenAppointmentId?: string | null;
  };

  // ✅ NOVO: remarcar
  pendingReschedule?: {
    mode: "SINGLE" | "CHOOSE";
    options: Array<{
      appointmentId: string;
      scheduledTimeUtc: string;
    }>;
    chosenAppointmentId?: string | null;

    // nova data/hora (local, antes de converter pra UTC)
    pendingNew?: {
      dateIso?: string; // YYYY-MM-DD
      time?: string; // HH:mm
    };
  };
};
