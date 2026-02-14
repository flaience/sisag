// src/modules/assistant/whatsapp-core/sessions/types.ts

export type ConversationContext = {
  pendingIntent?: "SCHEDULE_REQUEST" | "CANCEL_REQUEST" | "RESCHEDULE_REQUEST";

  pending?: {
    dateIso?: string; // YYYY-MM-DD
    time?: string; // HH:mm
  };

  /**
   * ✅ cancelamento com confirmação
   * - mode SINGLE: uma opção (próximo agendamento)
   * - mode CHOOSE: múltiplas opções (ex: listar 1/2/3) — pode implementar depois
   */
  pendingCancel?: {
    mode: "SINGLE" | "CHOOSE";
    options: Array<{
      appointmentId: string;
      scheduledTimeUtc: string; // ISO UTC
    }>;
    chosenAppointmentId?: string | null;
  };
};
