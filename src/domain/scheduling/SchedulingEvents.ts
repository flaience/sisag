export const SchedulingEvents = {
  APPOINTMENT_CREATED: "appointment.created",
  APPOINTMENT_CANCELLED: "appointment.cancelled",
  APPOINTMENT_RESCHEDULED: "appointment.rescheduled",
} as const;

export type SchedulingEventType =
  (typeof SchedulingEvents)[keyof typeof SchedulingEvents];
