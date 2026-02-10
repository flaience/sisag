export const OUTBOX_EVENT_TYPES = [
  "appointment.created",
  "appointment.cancelled",
  "appointment.rescheduled",
] as const;

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number];

// Payload mínimo para created (o que o worker precisa)
export type AppointmentCreatedPayload = {
  companyId: string;

  appointment: {
    id: string;
    scheduledTime: string | Date;
    status?: string | null;
  };

  client: {
    id?: string | null;
    name?: string | null;
    phoneE164: string; // ✅ obrigatório (destino)
    email?: string | null;
  };

  professional?: {
    id?: string | null;
    name?: string | null;
    specialty?: string | null;
  };

  meta?: {
    source?: "vscode" | "git" | "api";
    emittedAt?: string;
  };
};

export type AppointmentCancelledPayload = {
  companyId: string;
  appointmentId: string;
  cancelledAt: string;
  previousStatus?: string | null;
  meta?: { source?: "vscode" | "git" | "api"; emittedAt?: string };
};

export type AppointmentRescheduledPayload = {
  companyId: string;
  appointmentId: string;
  from: string | Date;
  to: string | Date;
  meta?: { source?: "vscode" | "git" | "api"; emittedAt?: string };
};
