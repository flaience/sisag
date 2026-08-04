import type {
  SchedulingAppointmentState,
  SchedulingOperationalEvent,
} from "./contract";

export type SchedulingStateTransition = {
  from: SchedulingAppointmentState | "any";
  event: SchedulingOperationalEvent;
  to: SchedulingAppointmentState;
  description: string;
};

export const schedulingStateTransitions: SchedulingStateTransition[] = [
  {
    from: "requested",
    event: "appointment.created",
    to: "pending",
    description: "A requested appointment becomes pending when created.",
  },
  {
    from: "pending",
    event: "appointment.confirmed",
    to: "confirmed",
    description: "A pending appointment becomes confirmed after confirmation.",
  },
  {
    from: "pending",
    event: "appointment.cancelled",
    to: "cancelled",
    description: "A pending appointment can be cancelled.",
  },
  {
    from: "confirmed",
    event: "appointment.cancelled",
    to: "cancelled",
    description: "A confirmed appointment can be cancelled.",
  },
  {
    from: "pending",
    event: "appointment.rescheduled",
    to: "pending",
    description:
      "A pending appointment can move to another slot while remaining pending.",
  },
  {
    from: "confirmed",
    event: "appointment.rescheduled",
    to: "confirmed",
    description:
      "A confirmed appointment can move to another slot while remaining confirmed.",
  },
  {
    from: "confirmed",
    event: "appointment.completed",
    to: "completed",
    description: "A confirmed appointment becomes completed after execution.",
  },
  {
    from: "pending",
    event: "appointment.expired",
    to: "expired",
    description: "A pending appointment can expire if not confirmed in time.",
  },
  {
    from: "confirmed",
    event: "appointment.no_show",
    to: "no_show",
    description: "A confirmed appointment can become no-show.",
  },
];

export function getSchedulingTransition(
  from: SchedulingAppointmentState,
  event: SchedulingOperationalEvent,
) {
  return schedulingStateTransitions.find(
    (transition) =>
      (transition.from === from || transition.from === "any") &&
      transition.event === event,
  );
}

export function canApplySchedulingEvent(
  from: SchedulingAppointmentState,
  event: SchedulingOperationalEvent,
) {
  return Boolean(getSchedulingTransition(from, event));
}
