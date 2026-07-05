export type SchedulingCapabilityName = "scheduling";

export type SchedulingOperationalObject =
  | "company"
  | "client"
  | "professional"
  | "service"
  | "resource"
  | "availability"
  | "appointment"
  | "communication"
  | "operational_journey";

export type SchedulingAppointmentState =
  | "requested"
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "expired"
  | "no_show";

export type SchedulingOperationalEvent =
  | "appointment.requested"
  | "appointment.created"
  | "appointment.confirmed"
  | "appointment.rescheduled"
  | "appointment.cancelled"
  | "appointment.completed"
  | "appointment.expired"
  | "appointment.no_show"
  | "availability.generated"
  | "availability.blocked"
  | "reminder.scheduled"
  | "reminder.sent"
  | "communication.sent"
  | "communication.failed";

export type SchedulingPublicOperation =
  | "find_available_slots"
  | "create_appointment"
  | "confirm_appointment"
  | "cancel_appointment"
  | "reschedule_appointment"
  | "complete_appointment"
  | "list_appointments"
  | "get_appointment_journey";

export type SchedulingAgentOperation =
  | "agent_find_available_slots"
  | "agent_create_appointment"
  | "agent_confirm_appointment"
  | "agent_cancel_appointment"
  | "agent_reschedule_appointment"
  | "agent_explain_appointment_status"
  | "agent_suggest_recovery_opportunities";

export type SchedulingCapabilityContract = {
  name: SchedulingCapabilityName;
  purpose: string;
  operationalObjects: SchedulingOperationalObject[];
  appointmentStates: SchedulingAppointmentState[];
  operationalEvents: SchedulingOperationalEvent[];
  publicOperations: SchedulingPublicOperation[];
  agentOperations: SchedulingAgentOperation[];
  guarantees: string[];
  constraints: string[];
};

export const schedulingCapabilityContract: SchedulingCapabilityContract = {
  name: "scheduling",

  purpose:
    "Represent the operational capability of reserving time, people, services and resources inside an operational context.",

  operationalObjects: [
    "company",
    "client",
    "professional",
    "service",
    "resource",
    "availability",
    "appointment",
    "communication",
    "operational_journey",
  ],

  appointmentStates: [
    "requested",
    "pending",
    "confirmed",
    "rescheduled",
    "cancelled",
    "completed",
    "expired",
    "no_show",
  ],

  operationalEvents: [
    "appointment.requested",
    "appointment.created",
    "appointment.confirmed",
    "appointment.rescheduled",
    "appointment.cancelled",
    "appointment.completed",
    "appointment.expired",
    "appointment.no_show",
    "availability.generated",
    "availability.blocked",
    "reminder.scheduled",
    "reminder.sent",
    "communication.sent",
    "communication.failed",
  ],

  publicOperations: [
    "find_available_slots",
    "create_appointment",
    "confirm_appointment",
    "cancel_appointment",
    "reschedule_appointment",
    "complete_appointment",
    "list_appointments",
    "get_appointment_journey",
  ],

  agentOperations: [
    "agent_find_available_slots",
    "agent_create_appointment",
    "agent_confirm_appointment",
    "agent_cancel_appointment",
    "agent_reschedule_appointment",
    "agent_explain_appointment_status",
    "agent_suggest_recovery_opportunities",
  ],

  guarantees: [
    "Scheduling is product-agnostic and must not depend on a specific vertical.",
    "Appointment state must be explainable by operational events.",
    "Confirmed appointments must not conflict on the same professional and time.",
    "Confirmed appointments must not conflict on the same resource and time.",
    "Rescheduling must preserve operational traceability.",
    "Cancellation must release reserved operational capacity.",
    "Agent operations must be safe, auditable and permission-aware.",
  ],

  constraints: [
    "The Scheduling capability must not use medical-specific language.",
    "The Scheduling capability must not access UI components directly.",
    "The Scheduling capability must not expose database implementation details to agents.",
    "The Scheduling capability must emit operational events for relevant state changes.",
  ],
};
