import type {
  SchedulingAppointmentState,
  SchedulingOperationalEvent,
  SchedulingPublicOperation,
} from "./contract";

export type SchedulingOperationActor = {
  type: "user" | "agent" | "system" | "api";
  id: string;
  name?: string | null;
};

export type SchedulingOperationContext = {
  companyId: string;
  actor: SchedulingOperationActor;
  correlationId?: string | null;
  causationId?: string | null;
};

export type FindAvailableSlotsInput = {
  professionalId?: string | null;
  serviceId?: string | null;
  resourceId?: string | null;

  dateFrom: string;
  dateTo: string;

  durationMinutes?: number | null;

  limit?: number;
  stepMinutes?: number;
};

export type AvailableSlot = {
  startsAt: string;
  endsAt: string;
  professionalId?: string | null;

  /**
   * Recursos operacionais necessários para executar o serviço.
   * Um agendamento pode depender de mais de um recurso.
   */
  resourceIds: string[];
};

export type CreateAppointmentInput = {
  clientId: string;
  professionalId?: string | null;
  serviceId?: string | null;
  resourceIds?: string[];
  startsAt: string;
  endsAt: string;
  notes?: string | null;
};

export type ConfirmAppointmentInput = {
  appointmentId: string;
};

export type CancelAppointmentInput = {
  appointmentId: string;
  reason?: string | null;
};

export type RescheduleAppointmentInput = {
  appointmentId: string;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
};

export type CompleteAppointmentInput = {
  appointmentId: string;
  notes?: string | null;
};

export type ListAppointmentsInput = {
  state?: SchedulingAppointmentState;
  from?: string;
  to?: string;
  clientId?: string;
  professionalId?: string;
  serviceId?: string;
  limit?: number;
  offset?: number;
};

export type AppointmentSummary = {
  id: string;
  companyId: string;
  clientId: string;
  professionalId?: string | null;
  serviceId?: string | null;
  resourceIds?: string[];
  startsAt: string;
  endsAt: string;
  state: SchedulingAppointmentState;
};

export type SchedulingOperationResult<TData = unknown> = {
  ok: boolean;
  data?: TData;
  error?: {
    code: string;
    message: string;
  };
  emittedEvents?: SchedulingOperationalEvent[];
};

export type SchedulingOperationsPort = {
  findAvailableSlots(
    context: SchedulingOperationContext,
    input: FindAvailableSlotsInput,
  ): Promise<SchedulingOperationResult<AvailableSlot[]>>;

  createAppointment(
    context: SchedulingOperationContext,
    input: CreateAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>>;

  confirmAppointment(
    context: SchedulingOperationContext,
    input: ConfirmAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>>;

  cancelAppointment(
    context: SchedulingOperationContext,
    input: CancelAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>>;

  rescheduleAppointment(
    context: SchedulingOperationContext,
    input: RescheduleAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>>;

  completeAppointment(
    context: SchedulingOperationContext,
    input: CompleteAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>>;

  listAppointments(
    context: SchedulingOperationContext,
    input?: ListAppointmentsInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary[]>>;

  getAppointmentJourney(
    context: SchedulingOperationContext,
    input: {
      appointmentId: string;
    },
  ): Promise<SchedulingOperationResult<unknown>>;
};

export type SchedulingOperationDefinition = {
  operation: SchedulingPublicOperation;
  description: string;
  emits: SchedulingOperationalEvent[];
};

export const schedulingOperationDefinitions: SchedulingOperationDefinition[] = [
  {
    operation: "find_available_slots",
    description:
      "Find available slots for a professional, service or resource within a date range.",
    emits: ["availability.generated"],
  },
  {
    operation: "create_appointment",
    description:
      "Create an appointment after validating availability and operational rules.",
    emits: ["appointment.created"],
  },
  {
    operation: "confirm_appointment",
    description: "Confirm an existing appointment.",
    emits: ["appointment.confirmed"],
  },
  {
    operation: "cancel_appointment",
    description:
      "Cancel an appointment while preserving traceability and operational reason.",
    emits: ["appointment.cancelled"],
  },
  {
    operation: "reschedule_appointment",
    description:
      "Move an appointment to another valid slot while preserving operational journey.",
    emits: ["appointment.rescheduled"],
  },
  {
    operation: "complete_appointment",
    description: "Mark an appointment as completed after service execution.",
    emits: ["appointment.completed"],
  },
  {
    operation: "list_appointments",
    description:
      "List appointments according to operational filters and access permissions.",
    emits: [],
  },
  {
    operation: "get_appointment_journey",
    description:
      "Retrieve the operational journey that explains how an appointment evolved.",
    emits: [],
  },
];
