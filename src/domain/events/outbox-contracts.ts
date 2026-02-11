// src/domain/events/outbox-contracts.ts
export const OUTBOX_EVENT_TYPES = [
  "appointment.created",
  "appointment.cancelled",
  "appointment.rescheduled",
  "whatsapp.send.requested",
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

// ✅ Novo: evento genérico para enviar mensagem WhatsApp (mock/meta/zapi)
// Isso mantém o inbound leve: ele só pede envio; o worker executa.
export type WhatsAppSendRequestedPayload = {
  companyId: string;
  toPhone: string; // E.164
  text: string;
  clientId?: string | null;
  correlationId?: string | null;
  meta?: { source?: "vscode" | "git" | "api"; emittedAt?: string };
};

// Mapeamento tipo → payload (ajuda muito o TS e evita payload errado)
export type OutboxPayloadByType = {
  "appointment.created": AppointmentCreatedPayload;
  "appointment.cancelled": AppointmentCancelledPayload;
  "appointment.rescheduled": AppointmentRescheduledPayload;
  "whatsapp.send.requested": WhatsAppSendRequestedPayload;
};
